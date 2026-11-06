"""Real-ESRGAN on CPU without PyTorch.

  build: read an official Real-ESRGAN .pth (zip checkpoint) with a restricted
         unpickler (only tensor/OrderedDict reconstruction is allowed), and emit an
         ONNX graph of the same network (RRDBNet x4/x2 or SRVGGNetCompact).
  run:   upscale a folder of PNGs with OpenVINO (bf16 on AMX CPUs, or f32).

Standalone on purpose (no local imports) so it can run with `python3 -I`.
"""
import argparse
import collections
import pickle
import sys
import time
import zipfile
from pathlib import Path

import numpy as np

# ----------------------------------------------------------------------------- .pth loading
_DT = {"FloatStorage": np.float32, "HalfStorage": np.float16, "DoubleStorage": np.float64,
       "LongStorage": np.int64, "IntStorage": np.int32, "ByteStorage": np.uint8}


def load_pth(path):
    z = zipfile.ZipFile(path)
    root = z.namelist()[0].split("/")[0]

    def rebuild_tensor(storage, offset, size, stride, *_):
        if len(size) == 0:
            return storage[offset]
        it = storage.itemsize
        return np.lib.stride_tricks.as_strided(storage[offset:], shape=tuple(size),
                                               strides=tuple(s * it for s in stride)).copy()

    class Restricted(pickle.Unpickler):
        def find_class(self, mod, name):
            if (mod, name) == ("torch._utils", "_rebuild_tensor_v2"):
                return rebuild_tensor
            if (mod, name) == ("torch._utils", "_rebuild_parameter"):
                return lambda data, *_: data
            if mod == "torch" and name in _DT:
                return _DT[name]
            if (mod, name) == ("collections", "OrderedDict"):
                return collections.OrderedDict
            raise pickle.UnpicklingError(f"blocked global {mod}.{name}")

        def persistent_load(self, pid):
            _, dtype, key, _loc, _numel = pid
            return np.frombuffer(z.read(f"{root}/data/{key}"), dtype=dtype)

    sd = Restricted(z.open(f"{root}/data.pkl")).load()
    for k in ("params_ema", "params"):
        if k in sd:
            return {n: np.asarray(v, np.float32) for n, v in sd[k].items()}
    return {n: np.asarray(v, np.float32) for n, v in sd.items()}


# ----------------------------------------------------------------------------- ONNX graphs
def build_onnx(weights, arch, scale, out_path):
    import onnx
    from onnx import TensorProto, helper, numpy_helper

    nodes, inits, uid = [], [], [0]

    def nm(p):
        uid[0] += 1
        return f"{p}_{uid[0]}"

    def const(arr, name=None):
        name = name or nm("c")
        inits.append(numpy_helper.from_array(np.asarray(arr, np.float32), name))
        return name

    def conv(x, key, w=None):
        w = weights[f"{key}.weight"] if w is None else w
        y = nm("conv")
        nodes.append(helper.make_node("Conv", [x, const(w, key + ".w"), const(weights[f"{key}.bias"], key + ".b")],
                                      [y], kernel_shape=[3, 3], pads=[1, 1, 1, 1]))
        return y

    def op(t, ins, **kw):
        y = nm(t.lower())
        nodes.append(helper.make_node(t, ins, [y], **kw))
        return y

    lrelu = lambda x: op("LeakyRelu", [x], alpha=0.2)
    cat = lambda xs: op("Concat", xs, axis=1)
    axpb = lambda a, s, b: op("Add", [op("Mul", [a, const(np.float32(s))]), b])   # a*s + b
    scales2 = const(np.array([1, 1, 2, 2], np.float32), "scales2")

    def up2(x):
        return op("Resize", [x, "", scales2], mode="nearest",
                  coordinate_transformation_mode="asymmetric", nearest_mode="floor")

    x = "input"
    if arch == "rrdb":
        w_first = weights["conv_first.weight"]
        if scale == 2:
            # torch pixel_unshuffle channel = c*4 + (i*2+j); ONNX SpaceToDepth = (i*2+j)*3 + c
            feat_in = op("SpaceToDepth", [x], blocksize=2)
            w_first = np.concatenate([w_first[:, [c * 4 + k for c in range(3)]] for k in range(4)], axis=1)
        else:
            feat_in = x
        feat = conv(feat_in, "conv_first", w_first)
        nb = 1 + max(int(k.split(".")[1]) for k in weights if k.startswith("body."))
        h = feat
        for b in range(nb):
            r_in = h
            for r in (1, 2, 3):
                p = f"body.{b}.rdb{r}"
                x0 = h
                x1 = lrelu(conv(x0, f"{p}.conv1"))
                x2 = lrelu(conv(cat([x0, x1]), f"{p}.conv2"))
                x3 = lrelu(conv(cat([x0, x1, x2]), f"{p}.conv3"))
                x4 = lrelu(conv(cat([x0, x1, x2, x3]), f"{p}.conv4"))
                x5 = conv(cat([x0, x1, x2, x3, x4]), f"{p}.conv5")
                h = axpb(x5, 0.2, x0)
            h = axpb(h, 0.2, r_in)
        feat = op("Add", [feat, conv(h, "conv_body")])
        feat = lrelu(conv(up2(feat), "conv_up1"))
        feat = lrelu(conv(up2(feat), "conv_up2"))
        out = conv(lrelu(conv(feat, "conv_hr")), "conv_last")
    elif arch == "srvgg":   # realesr-general-x4v3 (SRVGGNetCompact, PReLU)
        idx = sorted({int(k.split(".")[1]) for k in weights})
        h = x
        for i in idx:
            if weights[f"body.{i}.weight"].ndim == 4:
                h = conv(h, f"body.{i}")
            else:
                slope = weights[f"body.{i}.weight"].reshape(-1, 1, 1)
                h = op("PRelu", [h, const(slope)])
        h = op("DepthToSpace", [h], blocksize=4, mode="CRD")       # == torch PixelShuffle
        base = op("Resize", [x, "", const(np.array([1, 1, 4, 4], np.float32))], mode="nearest",
                  coordinate_transformation_mode="asymmetric", nearest_mode="floor")
        out = op("Add", [h, base])
    else:
        raise ValueError(arch)
    nodes.append(helper.make_node("Identity", [out], ["output"]))
    g = helper.make_graph(nodes, f"{arch}x{scale}",
                          [helper.make_tensor_value_info("input", TensorProto.FLOAT, [1, 3, "h", "w"])],
                          [helper.make_tensor_value_info("output", TensorProto.FLOAT, [1, 3, "H", "W"])],
                          inits)
    m = helper.make_model(g, opset_imports=[helper.make_opsetid("", 17)])
    m.ir_version = 8
    onnx.checker.check_model(m)
    onnx.save(m, str(out_path))
    print(f"wrote {out_path} ({len(nodes)} nodes)")


# ----------------------------------------------------------------------------- inference
def read_png(p):
    import cv2
    a = cv2.imread(str(p), cv2.IMREAD_UNCHANGED)
    a = a[..., ::-1]  # BGR -> RGB
    return a.astype(np.float32) / (65535.0 if a.dtype == np.uint16 else 255.0)


def write_png16(p, rgb):
    import cv2
    a = np.clip(rgb, 0, 1)
    cv2.imwrite(str(p), (a[..., ::-1] * 65535.0 + 0.5).astype(np.uint16))


def compile_model(model, h, w, precision):
    import openvino as ov
    core = ov.Core()
    m = core.read_model(str(model))
    m.reshape({"input": [1, 3, h, w]})
    cfg = {"INFERENCE_PRECISION_HINT": precision, "PERFORMANCE_HINT": "LATENCY"}
    return core.compile_model(m, "CPU", cfg)


def run(args):
    src = sorted(Path(args.inp).glob("*.png"))
    if args.frames:
        a, b = map(int, args.frames.split("-"))
        src = src[a - 1:b]
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    first = read_png(src[0])
    h, w = first.shape[:2]
    t0 = time.time()
    cm = compile_model(args.model, h, w, args.precision)
    print(f"compiled {Path(args.model).name} for {w}x{h} {args.precision} in {time.time() - t0:.1f}s", flush=True)
    times = []
    for i, p in enumerate(src):
        dst = out / p.name
        if dst.exists() and not args.force:
            continue
        x = read_png(p).transpose(2, 0, 1)[None].copy()
        t = time.time()
        y = cm({"input": x})[cm.output(0)][0].transpose(1, 2, 0)
        times.append(time.time() - t)
        write_png16(dst, y)
        print(f"{p.name} {times[-1]:.2f}s", flush=True)
    if times:
        print(f"mean {np.mean(times):.2f}s/frame over {len(times)} frames")


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("build")
    b.add_argument("--pth", required=True)
    b.add_argument("--arch", choices=["rrdb", "srvgg"], default="rrdb")
    b.add_argument("--scale", type=int, default=4)
    b.add_argument("--out", required=True)
    r = sub.add_parser("run")
    r.add_argument("--model", required=True)
    r.add_argument("--inp", required=True)
    r.add_argument("--out", required=True)
    r.add_argument("--precision", default="bf16", choices=["bf16", "f32", "f16"])
    r.add_argument("--frames", help="1-based inclusive range, e.g. 1-5")
    r.add_argument("--force", action="store_true")
    a = ap.parse_args()
    if a.cmd == "build":
        build_onnx(load_pth(a.pth), a.arch, a.scale, a.out)
    else:
        run(a)


if __name__ == "__main__":
    sys.exit(main())

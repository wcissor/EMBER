// Remotion CLI defaults for XO "One Breath" (brief section 9).
// scripts/render.py passes the same flags explicitly; these make
// `npx remotion render` / Studio renders match.
import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('png'); // no JPEG frames: keeps grain and gradients clean
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
Config.setColorSpace('bt709');
Config.setMuted(true);
Config.setOverwriteOutput(true);
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
	Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}

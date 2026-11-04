"""Azerbaijani letters → ARPAbet phones (approximate, for pocketsphinx's US-English acoustic model).
Used only to find and time the script's own words in the supplied takes (forced alignment), never to transcribe."""
import re

V = {'a': 'AA', 'ə': 'AE', 'e': 'EH', 'ı': 'IH', 'i': 'IY', 'o': 'AO', 'ö': 'ER', 'u': 'UW', 'ü': 'UW'}
C = {'b': 'B', 'c': 'JH', 'ç': 'CH', 'd': 'D', 'f': 'F', 'g': 'G', 'ğ': 'G', 'h': 'HH', 'x': 'HH', 'j': 'ZH', 'k': 'K',
     'q': 'G', 'l': 'L', 'm': 'M', 'n': 'N', 'p': 'P', 'r': 'R', 's': 'S', 'ş': 'SH', 't': 'T', 'v': 'V', 'y': 'Y', 'z': 'Z',
     'w': 'W'}


def lower_az(s: str) -> str:
    return s.replace('I', 'ı').replace('İ', 'i').lower()


def clean(w: str) -> str:
    return re.sub(r"[^a-zəğıöüçş]", '', lower_az(w))


def g2p(word: str) -> list:
    w = clean(word)
    out = []
    i = 0
    while i < len(w):
        ch = w[i]
        if ch in V:
            out.append(V[ch])
        elif ch in C:
            p = C[ch]
            # word-final q sounds [x]; ğ between vowels is mostly a glide
            if ch == 'q' and i == len(w) - 1:
                p = 'HH'
            if ch == 'ğ' and 0 < i < len(w) - 1 and w[i - 1] in V and w[i + 1] in V:
                p = 'Y'
            if not (out and out[-1] == p and ch in 'lnrs' and i > 0 and w[i - 1] == ch):
                out.append(p)
            elif ch in 'lnrs':
                pass
        i += 1
    return out


if __name__ == '__main__':
    import sys
    for w in sys.argv[1:]:
        print(w, ' '.join(g2p(w)))

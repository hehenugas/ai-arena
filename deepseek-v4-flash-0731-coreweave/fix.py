import re
import sys


def clean_path(p):
    with open(p, encoding='utf-8') as f:
        s = f.read()
    s = s.replace('g?', 'g')
    s = re.sub(r'\b(?:ird|such|say|alone|TWO|EO|so|和你|你)\b', '', s)
    s = s.replace(',,', ',')
    s = s.replace(',,,', ',')
    s = s.replace(',,', ',')
    s = s.replace(',,,', ',')
    s = s.replace(',,', ',')
    s = s.replace(',,,', ',')
    s = re.sub(r'^[ \t]*\{[ \t]+', '', s, flags=re.M)
    s = re.sub(r'\n\s*\{\s*\n', '\n', s)
    s = re.sub(r'^\s*\{\}\s*$', '', s, flags=re.M)
    s = re.sub(r'\n\s*\n', '\n\n', s)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(s)


if __name__ == '__main__':
    for p in sys.argv[1:]:
        clean_path(p)
"""Line ids, scripts and word counts shared by the audio scripts."""
ORDER = ['H1', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'H2', 'B1b', 'H3', 'B4s']  # order inside each take
COUNTS = {
    'en': {'H1': 12, 'B1': 7, 'B2': 21, 'B3': 7, 'B4': 17, 'B5': 12, 'B6': 14, 'B7': 17, 'B8': 9, 'H2': 14, 'B1b': 11, 'H3': 9, 'B4s': 14},
    'az': {'H1': 12, 'B1': 6, 'B2': 17, 'B3': 9, 'B4': 16, 'B5': 12, 'B6': 13, 'B7': 12, 'B8': 5, 'H2': 10, 'B1b': 10, 'H3': 8, 'B4s': 13},
}
VARIANTS = {
    'A': ['H1', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'],
    'B': ['H2', 'B1b', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'],
    'C': ['H3', 'B4s', 'B1b', 'B2', 'B3', 'B5', 'B6', 'B7', 'B8'],
}

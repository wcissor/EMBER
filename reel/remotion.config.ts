import {Config} from '@remotion/cli/config';

// Use the Chromium headless shell that ships with this environment instead of downloading one.
Config.setBrowserExecutable('/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell');
// Lossless frames into the encoder: hairlines and grain survive better than with JPEG intermediates.
Config.setVideoImageFormat('png');
Config.setConcurrency(4);
Config.setOverwriteOutput(true);

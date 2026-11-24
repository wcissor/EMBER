import {Config} from '@remotion/cli/config';

// Pre-installed headless shell (the container cannot download Remotion's own copy reliably).
Config.setBrowserExecutable(
  '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell',
);
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setConcurrency(3);
Config.setChromiumOpenGlRenderer('swangle');

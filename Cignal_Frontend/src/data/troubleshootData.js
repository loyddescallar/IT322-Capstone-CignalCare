// Cignal TV troubleshooting data used by the guided troubleshooting module.

const createCommonIssues = () => [
  {
    id: 'e1-e2-e11',
    category: 'Smart Card',
    shortTitle: 'E1 / E2 / E11',
    description: 'Smart Card is missing, unreadable, or not paired with the box.',
    keywords: ['e1', 'e2', 'e11', 'smart card', 'access', 'pairing'],
    sections: [
      {
        title: 'Restart the Cignal box',
        steps: [
          'Turn off the Cignal box using the remote control or front power button.',
          'Unplug the power adapter from the electrical outlet.',
          'Wait for 15 seconds before reconnecting the power.',
          'Allow the box to finish starting before checking the channel again.',
        ],
      },
      {
        title: 'Remove and clean the Smart Card',
        steps: [
          'Turn off the box before removing the Smart Card.',
          'Pull the Smart Card gently from its slot.',
          'Wipe the gold contacts using a clean, dry, lint-free cloth.',
          'Reinsert the Smart Card completely, following the direction shown beside the card slot.',
        ],
      },
      {
        title: 'Check Smart Card pairing',
        steps: [
          'Open Menu, then go to System Information or Conditional Access.',
          'Check whether the displayed Smart Card or Subscriber ID matches your account record.',
          'Contact support when the IDs do not match or the error remains after restarting.',
        ],
      },
    ],
    note: 'Do not scratch, bend, wet, or use chemicals on the Smart Card.',
  },
  {
    id: 'e4-e6-e14',
    category: 'Signal',
    shortTitle: 'E4 / E6 / E14',
    description: 'Technical, authorization, or satellite signal error.',
    keywords: ['e4', 'e6', 'e14', 'technical', 'signal', 'authorization'],
    sections: [
      {
        title: 'Restart the box',
        steps: [
          'Turn off the Cignal box.',
          'Disconnect its power adapter from the outlet.',
          'Wait for 15 seconds, reconnect it, and let it fully restart.',
          'Return to the affected channel and check whether the error cleared.',
        ],
      },
      {
        title: 'Check the satellite signal',
        steps: [
          'Open Menu, then go to System Setup, Installation, and Signal Test.',
          'Check that both signal strength and signal quality are stable.',
          'Inspect the visible indoor cable connection for looseness or damage.',
          'Wait for severe rain or thunderstorms to pass before testing again.',
        ],
      },
    ],
    note: 'Do not climb onto the roof or adjust the satellite dish yourself. Request a technician when dish alignment is suspected.',
  },
  {
    id: 'missing-channels',
    category: 'Channels',
    shortTitle: 'Missing or Skipping Channels',
    description: 'Some subscribed channels are absent or skipped while changing channels.',
    keywords: ['missing channels', 'skipping', 'channel scan', 'subscription'],
    sections: [
      {
        title: 'Confirm the account subscription',
        steps: [
          'Check that the prepaid load or subscription is still active.',
          'Confirm that the missing channel belongs to the subscribed package.',
          'After reloading, keep the box powered on for at least 15 minutes.',
        ],
      },
      {
        title: 'Check signal quality',
        steps: [
          'Open Menu, then go to Installation and Signal Test.',
          'Confirm that signal strength and quality are stable.',
          'Restart the box if the signal is acceptable but channels remain missing.',
        ],
      },
      {
        title: 'Run a channel scan',
        steps: [
          'Open Menu, then go to Installation or Channel Search.',
          'Choose Auto Scan, Full Scan, or Default TP depending on the box menu.',
          'Wait until scanning reaches 100 percent without turning off the box.',
          'Save the results and check the channel list again.',
        ],
      },
    ],
    note: 'Channel availability still depends on the active subscription package and current broadcast lineup.',
  },
  {
    id: 'technical-problem',
    category: 'Signal',
    shortTitle: 'Technical Problem or No Signal',
    description: 'The TV displays No Signal, a blue screen, or weak satellite reception.',
    keywords: ['no signal', 'blue screen', 'weak signal', 'dish', 'lnb', 'cable'],
    sections: [
      {
        title: 'Check the television input',
        steps: [
          'Make sure both the television and Cignal box are powered on.',
          'Press Source or Input on the television remote.',
          'Select the HDMI or AV input where the Cignal box is connected.',
        ],
      },
      {
        title: 'Check indoor cables',
        steps: [
          'Make sure the HDMI or AV cable is firmly connected to the television and box.',
          'Make sure the satellite coaxial cable is firmly connected to LNB IN or SAT IN.',
          'Look for loose connectors, cuts, sharp bends, or damaged cable sections.',
          'Try another HDMI port or cable when available.',
        ],
      },
      {
        title: 'Restart and retest',
        steps: [
          'Unplug the box for 15 seconds.',
          'Reconnect it and allow one to two minutes for startup.',
          'Test several channels after the box finishes loading.',
          'If bad weather is present, test again after the weather clears.',
        ],
      },
    ],
    note: 'A consistently weak signal during clear weather may require professional dish realignment.',
  },
  {
    id: 'av-failure',
    category: 'Audio / Video',
    shortTitle: 'Audio or Video Failure',
    description: 'There is no picture, no sound, distorted video, or an incorrect display.',
    keywords: ['audio', 'video', 'blank screen', 'distorted', 'hdmi', 'av'],
    sections: [
      {
        title: 'Check the connection',
        steps: [
          'Confirm that HDMI or AV cables are connected firmly at both ends.',
          'Select the correct television input source.',
          'Try another HDMI port or a known working cable if available.',
        ],
      },
      {
        title: 'Check audio and video settings',
        steps: [
          'Make sure the television and Cignal box are not muted.',
          'Increase the television volume and test another channel.',
          'Open the box settings and choose a resolution supported by the television.',
          'Use PCM or Stereo audio mode when the current audio mode produces no sound.',
        ],
      },
      {
        title: 'Restart both devices',
        steps: [
          'Turn off the television and Cignal box.',
          'Unplug both devices for 15 seconds.',
          'Reconnect the Cignal box first, then turn on the television.',
          'Test the picture and sound again.',
        ],
      },
    ],
    note: 'When only one channel is affected, the problem may be with the broadcast feed rather than the equipment.',
  },
  {
    id: 'not-powering-on',
    category: 'Power',
    shortTitle: 'Box Not Powering On',
    description: 'The box has no light, no display, or does not respond to the power button.',
    keywords: ['power', 'no light', 'not turning on', 'adapter', 'outlet'],
    sections: [
      {
        title: 'Check the power connection',
        steps: [
          'Make sure the power adapter is firmly connected to the Cignal box.',
          'Make sure the adapter is firmly plugged into the wall outlet.',
          'Check whether a power-strip switch is turned on.',
        ],
      },
      {
        title: 'Test the outlet and adapter',
        steps: [
          'Test the outlet using another safe household device.',
          'Try another working outlet when the first outlet has no power.',
          'Inspect the adapter and cable for cuts, exposed wires, unusual heat, or a burnt smell.',
          'Stop using the adapter immediately when damage, excessive heat, or a burnt smell is present.',
        ],
      },
    ],
    note: 'Use only a compatible Cignal power adapter. Never open the box or power adapter casing.',
  },
  {
    id: 'audio-distorted',
    category: 'Audio / Video',
    shortTitle: 'Distorted, Delayed, or No Audio',
    description: 'The sound is delayed, unclear, static, too low, or completely missing.',
    keywords: ['audio delay', 'static', 'no audio', 'sound', 'pcm', 'stereo'],
    sections: [
      {
        title: 'Check basic audio controls',
        steps: [
          'Make sure the television and Cignal box are not muted.',
          'Increase the television volume and test another channel.',
          'Press Audio or Language on the remote and select the normal audio track.',
        ],
      },
      {
        title: 'Change the audio output',
        steps: [
          'Open Menu, then go to Settings and Audio.',
          'Select PCM or Stereo output instead of an unsupported surround mode.',
          'Save the setting and test the affected channel again.',
        ],
      },
      {
        title: 'Restart the equipment',
        steps: [
          'Unplug the Cignal box for 15 seconds.',
          'Reconnect it and wait for startup to finish.',
          'Restart the television or connected sound system as well.',
        ],
      },
    ],
    note: 'When the issue happens on only one channel, it may be a temporary broadcast audio problem.',
  },
];

export const issueCategories = [
  'All',
  'Signal',
  'Smart Card',
  'Channels',
  'Audio / Video',
  'Power',
];

export const boxModels = [
  {
    id: 'arion-hd-zapper',
    name: 'Arion Cordless HD Zapper',
    type: 'HD',
    image: '/images/boxes/ArionCordlessHDZapper.png',
    issues: createCommonIssues(),
  },
  {
    id: 'changhong-silver-hd',
    name: 'Changhong Silver HD',
    type: 'HD',
    image: '/images/boxes/ChangHongSilverHD.png',
    issues: createCommonIssues(),
  },
  {
    id: 'pace-hd',
    name: 'Pace HD',
    type: 'HD',
    image: '/images/boxes/PACE.png',
    issues: createCommonIssues(),
  },
  {
    id: 'humax-hd',
    name: 'Humax HD',
    type: 'HD',
    image: '/images/boxes/Humax.png',
    issues: createCommonIssues(),
  },
  {
    id: 'samsung-pvr-hd',
    name: 'Samsung PVR',
    type: 'PVR',
    image: '/images/boxes/SamsungPVR.png',
    issues: createCommonIssues(),
  },
  {
    id: 'changhong-black-hd',
    name: 'Changhong Black HD',
    type: 'HD',
    image: '/images/boxes/ChangHongBlackHD.png',
    issues: createCommonIssues(),
  },
  {
    id: 'giec-hd',
    name: 'Giec HD',
    type: 'HD',
    image: '/images/boxes/GiecHD.png',
    issues: createCommonIssues(),
  },
  {
    id: 'samsung-hd',
    name: 'Samsung HD',
    type: 'HD',
    image: '/images/boxes/SamsungHD.png',
    issues: createCommonIssues(),
  },
];

export function findBoxModel(modelId) {
  return boxModels.find((model) => model.id === modelId);
}

export function findTroubleshootIssue(modelId, issueId) {
  return findBoxModel(modelId)?.issues.find((issue) => issue.id === issueId);
}

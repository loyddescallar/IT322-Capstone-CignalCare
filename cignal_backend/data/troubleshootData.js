// Verified Cignal TV troubleshooting data used by CignalCare+.
// Receiver-specific procedures are based on Cignal's public troubleshooting guides.
// The UI intentionally avoids inventing photographic port positions; component guidance
// identifies verified connection types and front-panel controls only.

const OFFICIAL_SOURCES = {
  arion: 'https://cignal.tv/article/2712/arion-hd-cardless-zapper',
  changhongSilver: 'https://cignal.tv/article/2713/changhong-silver-hd',
  changhongBlack: 'https://cignal.tv/article/2715/cignal-changhong-black-hd',
  samsungHd: 'https://cignal.tv/article/2717/samsung-hd',
  samsungPvr: 'https://cignal.tv/article/2718/samsung-pvr',
  pace: 'https://cignal.tv/article/2727/pace',
  humax: 'https://cignal.tv/article/2728/humax',
  giec: 'https://cignal.tv/article/2730/cignal-giec-hd',
};

const OFFICIAL_VIDEOS = {
  reset: {
    id: 'cignal-reset-box-2023',
    title: 'How to reset your Cignal Box',
    youtubeId: 'iZ6ckFZgkjc',
    source: 'Cignal',
    sourceLabel: 'Official Cignal YouTube',
    verified: true,
    coverage: 'partial',
    purpose: 'Shows the official Cignal hard-reset / factory-reset process as a visual reference.',
    note: 'This official video demonstrates the reset portion of troubleshooting. Receiver menu names can differ by model, so use the written model-specific guide whenever the on-screen menu does not match the video.',
  },
};

const resetVideoGuide = () => ({ ...OFFICIAL_VIDEOS.reset });

const hardReset15 = () => ({
  title: 'Perform a hard reset',
  steps: [
    'While the Cignal box is powered on, unplug it from the power outlet.',
    'Wait for 15 seconds.',
    'Plug the box back into the power outlet and allow it to restart completely.',
  ],
});

const smartCardReset = () => ({
  title: 'Check and reset the Smart Card',
  steps: [
    'Keep the Cignal box powered on while checking the Smart Card.',
    'Gently remove the Smart Card and inspect it for visible dirt or scratches.',
    'Clean the chip using a soft, dry cloth. If needed, use a clean pencil eraser gently and remove any eraser residue.',
    'Reinsert the Smart Card with the red side facing up and the arrow going into the box first.',
  ],
});

const accountStatusCheck = () => ({
  title: 'Check account status first',
  steps: [
    'Confirm that the Cignal account is active.',
    'Check whether there is an outstanding balance that may interrupt programming.',
    'If the account is already active and up to date, continue with the receiver troubleshooting steps.',
  ],
});

const channelLineupCheck = () => ({
  title: 'Confirm the channel is included in your line-up',
  steps: [
    'Check your current Cignal channel line-up or subscribed package.',
    'If the missing channel is not included in the active package, it cannot be restored through receiver troubleshooting.',
    'If the channel should be available, continue with the receiver reset procedure below.',
  ],
});

const factoryResetSections = {
  arion: () => ({
    title: 'Perform the Arion factory reset',
    steps: [
      'Press Menu on the remote control.',
      'Open Settings, then System, then Factory Default.',
      'Enter PIN 0000 or 9998, then choose System Reset.',
      'When the warning screen appears, choose Factory Reset and allow the box to reboot.',
      'Complete the First Time Installation Setup and save the pre-selected choices.',
      'After setup, browse the channel line-up and check whether the issue is cleared.',
    ],
  }),
  changhong: () => ({
    title: 'Perform the Changhong factory reset',
    steps: [
      'Press Menu on the remote control.',
      'Open System Setup and choose Factory Reset.',
      'Enter PIN 0000 or 9998 and confirm that you want to continue.',
      'Allow the receiver to reboot, then complete the First Time Installation Setup using the pre-selected choices.',
    ],
  }),
  giec: () => ({
    title: 'Perform the GIEC factory reset',
    steps: [
      'Press Menu on the remote control.',
      'Open System and choose Factory Default.',
      'Enter PIN 0000 or 9998 and confirm the factory reset.',
      'Allow the receiver to reboot and complete the First Time Installation Setup using the pre-selected choices.',
    ],
  }),
  legacySmartCard: () => ({
    title: 'Perform the receiver factory reset',
    steps: [
      'Press Menu on the remote control.',
      'Open Set-Up, then System Set-Up.',
      'Enter PIN 0000 or 9998.',
      'Open Installation Set-Up and choose Restore Factory.',
      'Enter PIN 0000 or 9998 again and confirm the reset.',
      'When instructed to restart the set-top box, unplug it and reconnect it after 30 seconds.',
      'Complete the First Time Installation Set Up and let the box test its signal.',
      'Under TV Set-up, use Fit to Screen when the receiver asks for the display setting.',
    ],
  }),
};

const signalCheckSections = {
  arion: () => ({
    title: 'Check signal levels on Arion',
    steps: [
      'Press Menu, then open Setting and Installation.',
      'Choose the rescan option and continue.',
      'Review the signal test. Cignal states that Signal Strength should be at least 20% and Signal Quality at least 50%.',
      'If the readings remain below the stated levels, request professional assistance instead of adjusting the dish yourself.',
    ],
  }),
  changhong: () => ({
    title: 'Check signal levels on Changhong',
    steps: [
      'Press Menu and open System Setup.',
      'Enter PIN 0000 or 0786 when requested.',
      'Choose Signal Test.',
      'Cignal states that Signal Strength should be at least 20% and Signal Quality at least 50%.',
      'If the readings remain below the stated levels, request professional assistance instead of adjusting the dish yourself.',
    ],
  }),
  giec: () => ({
    title: 'Check signal levels on GIEC',
    steps: [
      'Press Menu and open System Setup.',
      'Enter PIN 0000 or 0786 when requested.',
      'Choose Signal Test and review the receiver signal readings.',
      'If the readings are not acceptable or the technical problem remains, request professional assistance instead of adjusting the dish yourself.',
    ],
  }),
  legacySmartCard: () => ({
    title: 'Check receiver signal levels',
    steps: [
      'Press Menu and open System Set-Up.',
      'Enter PIN 0000 or 9998, then open Installation Set-Up and choose Signal Test.',
      'Cignal states that Signal Strength should be at least 20% and Signal Quality at least 50%.',
      'If the readings remain below the stated levels, request professional assistance instead of adjusting the dish yourself.',
    ],
  }),
};

const technicalSignalSections = (profile) => [
  {
    title: 'Check the weather condition',
    steps: [
      'Check whether heavy cloud cover, heavy rain, or severe weather is affecting the area.',
      'Because Cignal is satellite-based, severe weather can temporarily block the satellite signal.',
      'If the weather is already clear and the issue continues, proceed to the next step.',
    ],
  },
  {
    title: 'Check for recent changes around the dish connection',
    steps: [
      'Think about any recent roof repair, construction, or movement around the satellite dish area.',
      'Without climbing onto the roof, check that the visible coaxial cable is securely connected to the receiver port labeled LNB IN.',
      'Do not realign or reposition the satellite dish yourself.',
    ],
  },
  {
    title: 'Verify the technical-problem message',
    steps: [
      'If the Technical Problem message appears, press OK on the remote control to access the receiver menu.',
      'If the expected message does not appear, disconnect the coaxial cable from the box and perform a hard reset before reconnecting it.',
      'Reconnect the coaxial cable to LNB IN after the receiver restarts and continue.',
    ],
  },
  hardReset15(),
  factoryResetSections[profile](),
  signalCheckSections[profile](),
];

const avFailureSections = () => [
  {
    title: 'Check for recent TV setup changes',
    steps: [
      'Check whether a console, disc player, sound system, or other equipment was recently connected to the TV.',
      'Make sure the video cable from the Cignal box is still firmly connected to the television.',
    ],
  },
  {
    title: 'Confirm the Cignal box is powered on',
    steps: [
      'Try turning on the receiver with the remote control.',
      'Also try the Power button on the front panel of the receiver.',
      'If the box does not power on, use the Box Not Powering On guide instead.',
    ],
  },
  {
    title: 'Check the television input source',
    steps: [
      'Identify the HDMI, AV, or other input used by the Cignal box.',
      'Use the television remote to select that same input source.',
    ],
  },
  {
    title: 'Try another TV input port',
    steps: [
      'Move the Cignal video cable to another available HDMI or AV input on the television.',
      'Change the television input source to match the new port.',
    ],
  },
  {
    title: 'Test another HDMI or RCA cable when available',
    steps: [
      'If a known-working spare HDMI or RCA cable is available, use it temporarily between the box and television.',
      'If the spare cable works, the original cable may need replacement.',
    ],
  },
  {
    title: 'Compare with another video device when available',
    steps: [
      'If another video device works on the television, the concern may be with the Cignal box or its cable.',
      'If other video equipment also fails on the same television, the television may require checking.',
    ],
  },
];

const powerSections = () => [
  {
    title: 'Check the power source',
    steps: [
      'Make sure the Cignal box is securely connected to power.',
      'If it is connected through an extension cord, surge protector, regulator, AVR, or UPS, confirm that the device is switched on.',
      'Try connecting the box directly to a wall outlet.',
      'If needed, test another wall outlet, preferably in another room.',
    ],
  },
  {
    title: 'Try the front-panel Power button',
    steps: [
      'Press the Power button on the front panel of the Cignal box instead of using only the remote control.',
      'If the box powers on from the front panel, the remote control may be the source of the problem.',
    ],
  },
  {
    title: 'Test another compatible adapter only when available',
    steps: [
      'If your household has another Cignal box of the exact same model, you may test its compatible power adapter on the affected box.',
      'Do not use an adapter from a different model or with different electrical specifications.',
      'If the box still does not power on, request support.',
    ],
  },
];

const audioSections = (profile) => [
  {
    title: 'Check television volume',
    steps: [
      'Make sure the television is not muted.',
      'Increase the television volume to a normal audible level.',
    ],
  },
  {
    title: 'Check the Cignal box audio level',
    steps: [
      'Make sure the Cignal receiver is not muted.',
      'Increase the receiver volume using the Cignal remote control.',
    ],
  },
  {
    title: 'Check the audio/video cable connection',
    steps: [
      'Check that the cable between the Cignal box and the television or home-theater system is connected to the correct ports.',
      'Reconnect any loose HDMI or RCA connection.',
    ],
  },
  hardReset15(),
  factoryResetSections[profile](),
];

function createIssues({ profile, smartCard }) {
  const e1Sections = smartCard
    ? [smartCardReset(), hardReset15(), factoryResetSections[profile]()]
    : [hardReset15(), factoryResetSections[profile]()];

  return [
    {
      id: 'e1-e2-e11',
      category: smartCard ? 'Smart Card' : 'Receiver Error',
      shortTitle: 'E1 / E2 / E11',
      description: smartCard
        ? 'Follow the receiver-specific Cignal procedure for E1, E2, or E11, including Smart Card checks on this model.'
        : 'Follow the receiver-specific Cignal reset procedure for E1, E2, or E11 on this model.',
      keywords: ['e1', 'e2', 'e11', smartCard ? 'smart card' : 'receiver error', 'error code'],
      relatedComponents: smartCard
        ? ['smart-card-slot', 'power-input']
        : ['power-input'],
      videoGuides: [resetVideoGuide()],
      sections: e1Sections,
      note: smartCard
        ? 'Handle the Smart Card gently. Do not bend, wet, or scratch it.'
        : 'This receiver guide does not require a Smart Card removal step for this error code.',
    },
    {
      id: 'e4-e6-e14',
      category: 'Receiver Error',
      shortTitle: 'E4 / E6 / E14',
      description: 'Check account status first, then follow the receiver-specific reset procedure.',
      keywords: ['e4', 'e6', 'e14', 'account active', 'outstanding balance', 'receiver error'],
      relatedComponents: ['power-input'],
      videoGuides: [resetVideoGuide()],
      sections: [accountStatusCheck(), hardReset15(), factoryResetSections[profile]()],
      note: 'Do not assume a receiver fault when the account is inactive or has an outstanding balance.',
    },
    {
      id: 'missing-channels',
      category: 'Channels',
      shortTitle: 'Skipping / Missing Channels',
      description: 'Confirm the channel line-up, then use the reset procedure documented for this receiver.',
      keywords: ['missing channels', 'skipping channels', 'channel line-up', 'channel lineup'],
      relatedComponents: ['power-input'],
      videoGuides: [resetVideoGuide()],
      sections: [
        channelLineupCheck(),
        ...(profile === 'legacySmartCard' ? [hardReset15()] : []),
        factoryResetSections[profile](),
      ],
      note: 'A channel that is not included in the active package will not be restored by resetting the receiver.',
    },
    {
      id: 'technical-problem',
      category: 'Signal',
      shortTitle: 'Technical Problem / Signal Input',
      description: 'Use the Cignal signal-input procedure for this receiver, including LNB IN and the model-specific signal test.',
      keywords: ['technical problem', 'signal input', 'no signal', 'lnb', 'lnb in', 'coaxial', 'weather'],
      relatedComponents: ['lnb-in', 'power-input'],
      videoGuides: [resetVideoGuide()],
      sections: technicalSignalSections(profile),
      note: 'Do not climb onto the roof or realign the satellite dish yourself. Request a technician when dish alignment or outdoor cabling is suspected.',
    },
    {
      id: 'av-failure',
      category: 'Audio / Video',
      shortTitle: 'Audio / Video Failure',
      description: 'For a black, blue, blank, snowy, or missing TV picture, check power, input source, ports, and cables.',
      keywords: ['audio video failure', 'black screen', 'blue screen', 'snow', 'no picture', 'hdmi', 'rca', 'av'],
      relatedComponents: ['power-button', 'hdmi-av-out'],
      sections: avFailureSections(),
      note: 'Use only external connections. Do not open the receiver casing.',
    },
    {
      id: 'not-powering-on',
      category: 'Power',
      shortTitle: 'Cignal Box Not Powering On',
      description: 'Check the power source, front-panel Power button, and a compatible adapter when one is safely available.',
      keywords: ['not powering on', 'no power', 'power button', 'adapter', 'outlet'],
      relatedComponents: ['power-input', 'power-button'],
      sections: powerSections(),
      note: 'Never open the power adapter or receiver casing. Stop using visibly damaged or overheating power equipment.',
    },
    {
      id: 'audio-distorted',
      category: 'Audio / Video',
      shortTitle: 'Delayed / No / Distorted or Low Audio',
      description: 'Check television and receiver volume, cable connections, then follow the receiver-specific reset procedure.',
      keywords: ['delayed audio', 'no audio', 'distorted audio', 'low audio', 'sound', 'volume'],
      relatedComponents: ['hdmi-av-out', 'power-input'],
      videoGuides: [resetVideoGuide()],
      sections: audioSections(profile),
      note: 'If only one channel is affected, the problem may be with that channel feed rather than the receiver.',
    },
  ];
}

function createGuide({ smartCard = false, cardless = false } = {}) {
  const components = [
    {
      id: 'power-button',
      name: 'Front Power Button',
      area: 'Front panel',
      kind: 'control',
      description: 'Turns the receiver on from the box itself and helps separate a receiver power issue from a remote-control issue.',
      relatedIssues: ['av-failure', 'not-powering-on'],
      caution: 'This is an external control. Do not open the receiver casing.',
    },
    {
      id: 'lnb-in',
      name: 'LNB IN',
      area: 'Receiver connection',
      kind: 'signal',
      description: 'Connects the satellite coaxial cable to the receiver. Cignal troubleshooting specifically asks subscribers to check this connection for signal-input concerns.',
      relatedIssues: ['technical-problem'],
      caution: 'Check only the accessible indoor connection. Do not climb onto the roof or realign the dish.',
    },
    {
      id: 'hdmi-av-out',
      name: 'HDMI / AV Output',
      area: 'Receiver-to-TV connection',
      kind: 'video',
      description: 'Carries picture and sound from the Cignal receiver to the television through HDMI or RCA/AV, depending on the setup.',
      relatedIssues: ['av-failure', 'audio-distorted'],
      caution: 'Match the TV input source to the port being used.',
    },
    {
      id: 'power-input',
      name: 'Power Input / Adapter',
      area: 'Power connection',
      kind: 'power',
      description: 'Supplies power to the receiver and is involved in the documented hard-reset and power checks.',
      relatedIssues: ['e1-e2-e11', 'e4-e6-e14', 'missing-channels', 'technical-problem', 'not-powering-on', 'audio-distorted'],
      caution: 'Use only a compatible adapter and never open the adapter casing.',
    },
  ];

  if (smartCard) {
    components.splice(1, 0, {
      id: 'smart-card-slot',
      name: 'Smart Card Slot',
      area: 'Receiver card slot',
      kind: 'card',
      description: 'Holds the Cignal Smart Card used by this receiver family. Cignal documents a Smart Card reset for E1, E2, and E11 on this model.',
      relatedIssues: ['e1-e2-e11'],
      caution: 'Reinsert the card red side up with the arrow going in first, following Cignal guidance for this receiver family.',
    });
  }

  return {
    verified: true,
    cardless,
    displayMode: 'connection-guide',
    note: 'Component locations are described by their labels and function. CignalCare+ does not invent a photographic rear-panel layout where an official image has not been verified.',
    components,
    connections: [
      {
        id: 'satellite-path',
        from: 'Satellite Dish',
        through: 'Coaxial Cable',
        to: 'LNB IN',
        description: 'Satellite signal enters the receiver through the LNB IN connection.',
      },
      {
        id: 'tv-path',
        from: 'Cignal Box',
        through: 'HDMI or RCA / AV',
        to: 'Television',
        description: 'Picture and sound are sent from the receiver to the TV through the selected video connection.',
      },
      {
        id: 'power-path',
        from: 'Wall Outlet',
        through: 'Compatible Power Adapter',
        to: 'Power Input',
        description: 'The receiver must have a stable power connection before other checks are reliable.',
      },
    ],
  };
}

const issueCategories = [
  'All',
  'Receiver Error',
  'Signal',
  'Smart Card',
  'Channels',
  'Audio / Video',
  'Power',
];

const boxModels = [
  {
    id: 'arion-hd-zapper',
    name: 'Arion HD Cardless Zapper',
    type: 'HD',
    image: '/images/boxes/ArionCordlessHDZapper.png',
    description: 'Cardless HD receiver with Cignal-specific reset and signal-test menu paths.',
    sourceUrl: OFFICIAL_SOURCES.arion,
    sourceLabel: 'Cignal — Arion HD Cardless Zapper',
    guide: createGuide({ cardless: true }),
    issues: createIssues({ profile: 'arion', smartCard: false }),
  },
  {
    id: 'changhong-silver-hd',
    name: 'Changhong Silver HD',
    type: 'HD',
    image: '/images/boxes/ChangHongSilverHD.png',
    description: 'Changhong Silver HD receiver using the System Setup / Factory Reset workflow.',
    sourceUrl: OFFICIAL_SOURCES.changhongSilver,
    sourceLabel: 'Cignal — Changhong Silver HD',
    guide: createGuide(),
    issues: createIssues({ profile: 'changhong', smartCard: false }),
  },
  {
    id: 'pace-hd',
    name: 'Pace HD',
    type: 'HD',
    image: '/images/boxes/PACE.png',
    description: 'PACE receiver with Smart Card reset and Installation Set-Up procedures.',
    sourceUrl: OFFICIAL_SOURCES.pace,
    sourceLabel: 'Cignal — PACE',
    guide: createGuide({ smartCard: true }),
    issues: createIssues({ profile: 'legacySmartCard', smartCard: true }),
  },
  {
    id: 'humax-hd',
    name: 'Humax HD',
    type: 'HD',
    image: '/images/boxes/Humax.png',
    description: 'HUMAX receiver with Smart Card reset and Installation Set-Up procedures.',
    sourceUrl: OFFICIAL_SOURCES.humax,
    sourceLabel: 'Cignal — HUMAX',
    guide: createGuide({ smartCard: true }),
    issues: createIssues({ profile: 'legacySmartCard', smartCard: true }),
  },
  {
    id: 'samsung-pvr-hd',
    name: 'Samsung PVR',
    type: 'PVR',
    image: '/images/boxes/SamsungPVR.png',
    description: 'Samsung PVR receiver with Smart Card reset and Installation Set-Up procedures.',
    sourceUrl: OFFICIAL_SOURCES.samsungPvr,
    sourceLabel: 'Cignal — Samsung PVR',
    guide: createGuide({ smartCard: true }),
    issues: createIssues({ profile: 'legacySmartCard', smartCard: true }),
  },
  {
    id: 'changhong-black-hd',
    name: 'Changhong Black HD',
    type: 'HD',
    image: '/images/boxes/ChangHongBlackHD.png',
    description: 'Changhong Black HD receiver using the System Setup / Factory Reset workflow.',
    sourceUrl: OFFICIAL_SOURCES.changhongBlack,
    sourceLabel: 'Cignal — Changhong Black HD',
    guide: createGuide(),
    issues: createIssues({ profile: 'changhong', smartCard: false }),
  },
  {
    id: 'giec-hd',
    name: 'GIEC HD',
    type: 'HD',
    image: '/images/boxes/GiecHD.png',
    description: 'GIEC HD receiver using the System / Factory Default workflow.',
    sourceUrl: OFFICIAL_SOURCES.giec,
    sourceLabel: 'Cignal — GIEC HD',
    guide: createGuide(),
    issues: createIssues({ profile: 'giec', smartCard: false }),
  },
  {
    id: 'samsung-hd',
    name: 'Samsung HD',
    type: 'HD',
    image: '/images/boxes/SamsungHD.png',
    description: 'Samsung HD receiver with Smart Card reset and Installation Set-Up procedures.',
    sourceUrl: OFFICIAL_SOURCES.samsungHd,
    sourceLabel: 'Cignal — Samsung HD',
    guide: createGuide({ smartCard: true }),
    issues: createIssues({ profile: 'legacySmartCard', smartCard: true }),
  },
];

function findBoxModel(modelId) {
  return boxModels.find((model) => model.id === modelId);
}

function findTroubleshootIssue(modelId, issueId) {
  return findBoxModel(modelId)?.issues.find((issue) => issue.id === issueId);
}

module.exports = {
  OFFICIAL_SOURCES,
  issueCategories,
  boxModels,
  findBoxModel,
  findTroubleshootIssue,
};

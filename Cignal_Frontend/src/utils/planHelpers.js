import { prepaidPlans } from '../data/prepaidPlans';

export const CHANNEL_CATEGORIES = [
  'All',
  'Entertainment',
  'Movies',
  'News',
  'Sports',
  'Kids',
  'Educational',
  'Religious',
  'Shopping',
  'Radio',
  'Others',
];

export function fallbackChannelsForPlan(plan) {
  const amountKey = String(plan?.amount || '').replace(/\.00$/, '');
  const fromAmount = prepaidPlans[amountKey]?.channels || [];

  if (fromAmount.length) return fromAmount;

  const match = Object.values(prepaidPlans).find(
    (item) => String(item.name).toLowerCase() === String(plan?.plan_name || plan?.name || '').toLowerCase()
  );

  return match?.channels || [];
}

export function normalizePlan(plan) {
  const apiChannels = Array.isArray(plan?.channels) ? plan.channels : [];
  const fallbackChannels = fallbackChannelsForPlan(plan);
  const channelData = apiChannels.length ? apiChannels : fallbackChannels;
  const amount = Number(plan?.amount || 0);

  return {
    ...plan,
    id: plan?.id ?? String(amount),
    plan_code: plan?.plan_code || plan?.planCode || `REG${amount || ''}`,
    plan_name: plan?.plan_name || plan?.name || `Load ${amount}`,
    name: plan?.plan_name || plan?.name || `Load ${amount}`,
    amount,
    validity_days: Number(plan?.validity_days || plan?.validityDays || 30),
    duration: `${Number(plan?.validity_days || plan?.validityDays || 30)} days`,
    hd_channels: Number(plan?.hd_channels || plan?.hdChannels || 0),
    sd_channels: Number(plan?.sd_channels || plan?.sdChannels || 0),
    benefits_text: plan?.benefits_text || plan?.benefitsText || plan?.description || '',
    description: plan?.benefits_text || plan?.benefitsText || plan?.description || 'Cignal prepaid load package.',
    status: plan?.status || 'active',
    channels: channelData.length,
    channelData,
  };
}

export function fallbackPlanList() {
  return Object.values(prepaidPlans).map((plan) => normalizePlan({
    id: plan.id,
    plan_code: `REG${plan.amount}`,
    plan_name: plan.name,
    amount: plan.amount,
    validity_days: 30,
    benefits_text: plan.description,
    status: 'active',
    channels: plan.channels || [],
  }));
}

export function parseChannelLines(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, category] = line.split('|').map((part) => part.trim());
      return {
        name,
        category: category || 'Others',
      };
    })
    .filter((channel) => channel.name);
}

export function channelsToText(channels) {
  return (channels || [])
    .map((channel) => `${channel.name}${channel.category ? ` | ${channel.category}` : ''}`)
    .join('\n');
}

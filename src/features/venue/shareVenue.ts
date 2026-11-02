import { Share } from 'react-native';

export async function shareVenueLink(url: string, title: string): Promise<'shared' | 'copied' | 'dismissed'> {
  const result = await Share.share({ title, message: `${title}\n${url}`, url });
  if (result.action === Share.dismissedAction) return 'dismissed';
  return 'shared';
}

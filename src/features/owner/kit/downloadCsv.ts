import { Platform, Share } from 'react-native';

/** Saves CSV text as a file in a browser, or opens the share sheet on a phone. */
export async function downloadCsv(csv: string, fileName: string, title: string): Promise<void> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({ message: csv, title });
}

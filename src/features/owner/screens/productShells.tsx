import { useTranslation } from 'react-i18next';
import { ShellScreen } from './ShellScreen';

export function StockShell() {
  const { t } = useTranslation();
  return <ShellScreen title={t('owner.stock')} body={t('owner.shellStock')} next={[t('owner.stockNext1'), t('owner.stockNext2'), t('owner.stockNext3')]} />;
}

export function PosShell() {
  const { t } = useTranslation();
  return <ShellScreen title={t('owner.pos')} body={t('owner.shellPos')} next={[t('owner.posNext1'), t('owner.posNext2'), t('owner.posNext3')]} />;
}

export function AiShell() {
  const { t } = useTranslation();
  return <ShellScreen title={t('owner.ai')} body={t('owner.shellAi')} next={[t('owner.aiNext1'), t('owner.aiNext2'), t('owner.aiNext3')]} />;
}

export function MarketingShell() {
  const { t } = useTranslation();
  return <ShellScreen title={t('owner.marketing')} body={t('owner.shellMarketing')} next={[t('owner.marketNext1'), t('owner.marketNext2'), t('owner.marketNext3')]} />;
}

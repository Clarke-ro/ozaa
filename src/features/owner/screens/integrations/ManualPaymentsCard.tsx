import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Banknote, CreditCard, Landmark, Smartphone } from 'lucide-react-native';
import type { ManualPayments, PaymentSettings } from '@/lib/api/types';
import { checkManualPayments } from '@/lib/payments';
import { IntegrationCard } from './IntegrationCard';
import { usePayments } from './usePayments';

type Props = { venueId: string; settings: PaymentSettings };

/** Saves one switch at once, when the methods are still complete; otherwise opens the page. */
function useManualSwitch(venueId: string, saved: ManualPayments) {
  const { setManual } = usePayments(venueId);
  return (changes: Partial<ManualPayments>, page?: string) => {
    const next = { ...saved, ...changes };
    if (checkManualPayments(next).ok) setManual.mutate(next);
    else if (page) return page;
    return null;
  };
}

/**
 * The ways guests pay in person, each its own card (design canvas). Staff mark these orders paid
 * by hand. Cash and card machine are just a switch; bank transfer and MoMo to the venue's number
 * need details, so they open their own page, and switching one on without details goes there.
 */
export function CashCard({ venueId, settings }: Props) {
  const { t } = useTranslation();
  const flip = useManualSwitch(venueId, settings.manual);
  const on = settings.manual.cash;
  return (
    <IntegrationCard
      icon={Banknote}
      title={t('ownerPay.cash')}
      subtitle={t('ownerPay.cashSub')}
      status={on ? t('ownerPay.on') : t('ownerPay.off')}
      on={on}
      onToggle={(cash) => flip({ cash })}
    />
  );
}

export function CardMachineCard({ venueId, settings }: Props) {
  const { t } = useTranslation();
  const flip = useManualSwitch(venueId, settings.manual);
  const on = settings.manual.cardMachine;
  return (
    <IntegrationCard
      icon={CreditCard}
      title={t('ownerPay.cardMachine')}
      subtitle={t('ownerPay.cardMachineHint')}
      status={on ? t('ownerPay.on') : t('ownerPay.off')}
      on={on}
      onToggle={(cardMachine) => flip({ cardMachine })}
    />
  );
}

export function BankCard({ venueId, settings }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const flip = useManualSwitch(venueId, settings.manual);
  const bank = settings.manual.bankTransfer;
  const open = () => router.push('/owner/integrations/bank');
  return (
    <IntegrationCard
      icon={Landmark}
      title={t('ownerPay.bank')}
      subtitle={t('ownerPay.bankSub')}
      status={bank.enabled ? t('ownerPay.on') : t('ownerPay.notConnected')}
      on={bank.enabled}
      onToggle={(enabled) => {
        if (flip({ bankTransfer: { ...bank, enabled } }, 'bank')) open();
      }}
      onOpen={open}
    />
  );
}

export function MomoCard({ venueId, settings }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const flip = useManualSwitch(venueId, settings.manual);
  const momo = settings.manual.momo;
  const open = () => router.push('/owner/integrations/momo');
  return (
    <IntegrationCard
      icon={Smartphone}
      title={t('ownerPay.momo')}
      subtitle={t('ownerPay.momoHint')}
      status={momo.enabled ? t('ownerPay.on') : t('ownerPay.notConnected')}
      on={momo.enabled}
      onToggle={(enabled) => {
        if (flip({ momo: { ...momo, enabled } }, 'momo')) open();
      }}
      onOpen={open}
    />
  );
}

import { cartCount, cartEstimate, useCart } from './cartStore';
import { pesewas } from '@/lib/brand';

const jollof = {
  menuItemId: 'itm_1',
  name: 'Jollof & chicken',
  quantity: 1,
  unitPricePesewas: pesewas(6500),
  modifierPesewas: pesewas(0),
  modifierOptionIds: [],
};

beforeEach(() => useCart.setState({ slug: null, lines: [] }));

test('adding the same dish twice shows 2 and the summed estimate', () => {
  useCart.getState().add('mamas-kitchen', jollof);
  useCart.getState().add('mamas-kitchen', jollof);
  const { lines } = useCart.getState();
  expect(cartCount(lines)).toBe(2);
  expect(cartEstimate(lines)).toBe(13000);
});

test('a different venue starts a new basket', () => {
  useCart.getState().add('mamas-kitchen', jollof);
  useCart.getState().add('bean-there', { ...jollof, name: 'Flat white', unitPricePesewas: pesewas(3800) });
  expect(useCart.getState().slug).toBe('bean-there');
  expect(cartCount(useCart.getState().lines)).toBe(1);
});

// Sample venue data. In production this comes from the venue's settings.
window.FONT_PAIRS = {
  ozaa:    { label: 'Ozaa (Unbounded + Inter)', display: 'Unbounded', weight: 700 },
  serif:   { label: 'Classic (Noto Serif + Inter)', display: 'Noto Serif', weight: 700 },
  bold:    { label: 'Bold (Montserrat + Inter)', display: 'Montserrat', weight: 800 },
};
window.VENUES = {
  mamas: {
    name: "Mama's Kitchen", initials: 'MK', accent: '#B5432A', font: 'serif',
    banner: 'img/banner-mamas.jpg', about: 'Home-style Ghanaian plates, cooked fresh every day since 2009.',
    place: 'Oxford Street, Osu, Accra', open: 'Open now', until: 'until 10 PM', lang: 'EN',
    cats: ['Mains', 'Sides', 'Soups', 'Drinks'],
    section: 'Mains', items: [
      { n: 'Jollof & chicken', d: 'Smoky party jollof, grilled chicken, fried plantain and shito.', p: 65, img: 'img/jollof.jpg', pop: true },
      { n: 'Waakye special', d: 'Rice and beans with gari, spaghetti, egg, wele and stew.', p: 45, img: 'img/waakye.jpg' },
      { n: 'Banku & tilapia', d: 'Whole grilled tilapia, hot pepper and onions.', p: 90, img: 'img/banku-tilapia.jpg', pop: true },
      { n: 'Kɛlɛwɛlɛ', d: 'Spicy fried ripe plantain with roasted groundnuts.', p: 20, img: 'img/kelewele.jpg' },
      { n: 'Sobolo', d: 'Chilled hibiscus with ginger and pineapple.', p: 15, img: 'img/sobolo.jpg' },
    ] },
  bean: {
    name: 'Bean There', initials: 'BT', accent: '#1F5C3F', font: 'bold', logoIcon: 'bean',
    banner: 'img/banner-bean.jpg', about: 'Ghana-grown coffee, fresh pastries and quiet tables to work from.',
    place: 'Lagos Avenue, East Legon, Accra', open: 'Open now', until: 'until 8 PM', lang: 'EN',
    cats: ['Coffee', 'Pastries', 'Cold drinks', 'Breakfast'],
    section: 'Coffee', items: [
      { n: 'Flat white', d: 'Double shot of Volta-grown espresso with silky milk.', p: 38, img: 'img/latte.jpg', pop: true },
      { n: 'Croissant & meat pie', d: 'Butter croissant and a Ghana-style beef pie, warmed.', p: 45, img: 'img/pastry.jpg' },
      { n: 'Sobolo cold brew', d: 'Hibiscus, ginger and a shot of cold brew over ice.', p: 32, img: 'img/sobolo.jpg', pop: true },
      { n: 'Kelewele bites', d: 'A small bowl of spicy plantain to go with your coffee.', p: 18, img: 'img/kelewele.jpg' },
    ] },
  akos: {
    name: 'Auntie Akos Chop Bar', initials: 'AA', accent: '#FFC21A', font: 'ozaa',
    banner: 'img/banner-akos.jpg', about: 'Fufu pounded to order and soups from the big pots. Come hungry.',
    place: 'Kaneshie Market Road, Accra', open: 'Open now', until: 'until 9 PM', lang: 'TWI',
    cats: ['Fufu', 'Banku', 'Rice', 'Drinks'],
    section: 'Fufu & soups', items: [
      { n: 'Fufu & light soup', d: 'Pounded to order, goat meat light soup.', p: 55, img: 'img/fufu.jpg', pop: true },
      { n: 'Banku & tilapia', d: 'Grilled tilapia, pepper and onions.', p: 85, img: 'img/banku-tilapia.jpg', pop: true },
      { n: 'Kenkey & fish', d: 'Ga kenkey, fried fish, shito and fresh pepper.', p: 35, img: 'img/kenkey.jpg' },
      { n: 'Red red', d: 'Bean stew in palm oil, fried plantain and gari.', p: 30, img: 'img/redred.jpg' },
    ] },
};

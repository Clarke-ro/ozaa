import { Tabs } from 'expo-router';
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#D24000' }}>
      <Tabs.Screen name="index" options={{ title: 'Orders' }} />
      <Tabs.Screen name="reviews" options={{ title: 'Reviews' }} />
      <Tabs.Screen name="services" options={{ title: 'Services' }} />
      <Tabs.Screen name="customise" options={{ title: 'Customise' }} />
    </Tabs>
  );
}

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { HomeScreen } from '../screens/main/HomeScreen';
import { ContactsScreen } from '../screens/main/ContactsScreen';
import { ShareLocationScreen } from '../screens/main/ShareLocationScreen';
import { IncidentsScreen } from '../screens/main/IncidentsScreen';
import { AppMenuScreen } from '../screens/main/AppMenuScreen';
import { useTheme } from '../hooks/useTheme';

const Tab = createBottomTabNavigator();

export function MainTabs() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSubtle,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: theme.colors.bottomBar,
          borderTopColor: theme.colors.border,
          height: 72,
          paddingTop: 6,
          paddingBottom: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, focused }) => {
          const iconMap = {
            Home: focused ? 'home' : 'home-outline',
            Contacts: focused ? 'people' : 'people-outline',
            LiveShare: focused ? 'location' : 'location-outline',
            Incidents: focused ? 'document-text' : 'document-text-outline',
            Menu: focused ? 'menu' : 'menu-outline',
          };

          return <Ionicons name={iconMap[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Contacts" component={ContactsScreen} options={{ title: 'Contacts' }} />
      <Tab.Screen name="LiveShare" component={ShareLocationScreen} options={{ title: 'Location' }} />
      <Tab.Screen name="Incidents" component={IncidentsScreen} options={{ title: 'Reports' }} />
      <Tab.Screen name="Menu" component={AppMenuScreen} options={{ title: 'Menu' }} />
    </Tab.Navigator>
  );
}

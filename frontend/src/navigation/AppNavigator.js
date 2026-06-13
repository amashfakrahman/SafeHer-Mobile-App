import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { AuthNavigator } from './AuthNavigator';
import { MainTabs } from './MainTabs';
import { HelpCentersScreen } from '../screens/main/HelpCentersScreen';
import { ReportIncidentScreen } from '../screens/main/ReportIncidentScreen';
import { CommunityScreen } from '../screens/main/CommunityScreen';
import { EvidenceVaultScreen } from '../screens/main/EvidenceVaultScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { LoadingScreen } from '../components/LoadingScreen';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  const { isReady, navigationTheme, resolvedMode, setThemePreference } = useTheme();
  const { isAuthenticated, isBootstrapping, user } = useAuth();

  useEffect(() => {
    if (user?.themePreference) {
      setThemePreference(user.themePreference);
    }
  }, [setThemePreference, user?.themePreference]);

  if (!isReady || isBootstrapping) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />
      {isAuthenticated ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Tabs" component={MainTabs} />
          <Stack.Screen name="HelpCenters" component={HelpCentersScreen} />
          <Stack.Screen name="ReportIncident" component={ReportIncidentScreen} />
          <Stack.Screen name="Community" component={CommunityScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="EvidenceVault" component={EvidenceVaultScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </Stack.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}

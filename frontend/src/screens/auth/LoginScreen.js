import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenWrapper } from '../../components/ScreenWrapper';
import { FormInput } from '../../components/FormInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Card } from '../../components/Card';
import { InfoBanner } from '../../components/InfoBanner';
import { BrandMark } from '../../components/BrandMark';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { getApiErrorMessage } from '../../api/client';
import { cleanText, hasErrors, required } from '../../utils/validation';

export function LoginScreen({ navigation }) {
  const { login, isSubmitting } = useAuth();
  const { theme } = useTheme();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  const validate = () => {
    const nextErrors = {
      identifier: required(identifier, 'Email or phone'),
      password: required(password, 'Password'),
    };
    setErrors(nextErrors);
    return !hasErrors(nextErrors);
  };

  const handleLogin = async () => {
    setFormError('');
    if (!validate()) return;

    try {
      await login({ identifier: cleanText(identifier), password });
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    }
  };

  return (
    <ScreenWrapper keyboardAware decorative={false} contentContainerStyle={{ justifyContent: 'center' }}>
      <View style={{ marginHorizontal: -theme.spacing.lg, marginTop: -theme.spacing.md, marginBottom: theme.spacing.xl, backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.xxxl, paddingBottom: theme.spacing.xxl, borderBottomLeftRadius: 44, borderBottomRightRadius: 44, overflow: 'hidden' }}>
        <View pointerEvents="none" style={{ position: 'absolute', right: -58, top: -34, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.16)' }} />
        <View pointerEvents="none" style={{ position: 'absolute', left: -50, bottom: -60, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(0,0,0,0.10)' }} />
        <BrandMark size="lg" inverted subtitle="Share your journey, stay connected with live tracking, feel secure." />
      </View>

      <Card elevated padding="xl" style={{ marginTop: -theme.spacing.lg }}>
        <Text style={{ color: theme.colors.text, fontSize: 30, fontWeight: '900', letterSpacing: -0.8 }}>Sign in now</Text>
        <Text style={{ color: theme.colors.textMuted, marginTop: 8, lineHeight: 21 }}>One tap away from security. Your SOS flow, trusted contacts, and reports stay connected to your account.</Text>

        {formError ? <InfoBanner tone="danger" title="Login failed" message={formError} style={{ marginTop: theme.spacing.lg }} /> : null}

        <View style={{ marginTop: theme.spacing.xl }}>
          <FormInput
            label="Email or phone"
            value={identifier}
            onChangeText={(value) => {
              setIdentifier(value);
              setFormError('');
              if (errors.identifier) setErrors((current) => ({ ...current, identifier: '' }));
            }}
            placeholder="Enter email address or phone"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.identifier}
            leftIcon="mail-outline"
          />
          <FormInput
            label="Password"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setFormError('');
              if (errors.password) setErrors((current) => ({ ...current, password: '' }));
            }}
            placeholder="Enter password"
            secureTextEntry={!showPassword}
            error={errors.password}
            leftIcon="lock-closed-outline"
            rightElement={
              <Pressable onPress={() => setShowPassword((current) => !current)} accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color={theme.colors.textMuted} />
              </Pressable>
            }
          />
          <PrimaryButton title="Sign in" onPress={handleLogin} loading={isSubmitting} />
        </View>

        <Pressable onPress={() => navigation.navigate('Signup')} style={{ marginTop: theme.spacing.xl }} accessibilityRole="button">
          <Text style={{ color: theme.colors.textMuted, textAlign: 'center', fontWeight: '700' }}>
            Don't have an account? <Text style={{ color: theme.colors.primary, fontWeight: '900' }}>Sign up</Text>
          </Text>
        </Pressable>
      </Card>

      <InfoBanner
        tone="info"
        icon="lock-closed-outline"
        title="Privacy-first safety tools"
        message="Location is requested only when a safety action needs it: SOS, live sharing, help centers, or incident context."
        style={{ marginTop: theme.spacing.lg }}
      />
    </ScreenWrapper>
  );
}

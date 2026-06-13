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
import { cleanText, hasErrors, minLength, required, validateEmail, validatePhone } from '../../utils/validation';

export function SignupScreen({ navigation }) {
  const { register, isSubmitting } = useAuth();
  const { theme } = useTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  const validate = () => {
    const nextErrors = {
      fullName: minLength(fullName, 2, 'Full name'),
      email: required(email, 'Email') || validateEmail(email),
      phone: required(phone, 'Phone') || validatePhone(phone),
      password: minLength(password, 8, 'Password') || (!/[A-Z]/.test(password) ? 'Password must include an uppercase letter.' : '') || (!/[0-9]/.test(password) ? 'Password must include a number.' : ''),
    };
    setErrors(nextErrors);
    return !hasErrors(nextErrors);
  };

  const clearError = (key) => {
    setFormError('');
    if (errors[key]) setErrors((current) => ({ ...current, [key]: '' }));
  };

  const handleSignup = async () => {
    setFormError('');
    if (!validate()) return;

    try {
      await register({
        fullName: cleanText(fullName),
        email: cleanText(email).toLowerCase(),
        phone: cleanText(phone),
        password,
      });
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    }
  };

  return (
    <ScreenWrapper keyboardAware decorative={false}>
      <Pressable onPress={() => navigation.goBack()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.lg, ...theme.softShadow }} accessibilityRole="button" accessibilityLabel="Go back">
        <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
      </Pressable>

      <View style={{ backgroundColor: theme.colors.primary, borderRadius: theme.radius.xxl, padding: theme.spacing.xl, marginBottom: -theme.spacing.lg, overflow: 'hidden' }}>
        <View pointerEvents="none" style={{ position: 'absolute', right: -40, top: -42, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.16)' }} />
        <BrandMark inverted subtitle="Create your safety profile and keep your trusted network ready." />
      </View>

      <Card elevated padding="xl" style={{ marginTop: theme.spacing.xxl }}>
        <Text style={{ color: theme.colors.text, fontSize: 30, fontWeight: '900', letterSpacing: -0.8 }}>Create account</Text>
        <Text style={{ color: theme.colors.textMuted, marginTop: 8, lineHeight: 21 }}>One tap away from security. Account details help identify you during alerts.</Text>

        {formError ? <InfoBanner tone="danger" title="Signup failed" message={formError} style={{ marginTop: theme.spacing.lg }} /> : null}

        <InfoBanner
          tone="info"
          title="Safety data stays purposeful"
          message="Your profile keeps emergency alerts clear and helps trusted contacts know who needs support."
          style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.md }}
        />

        <FormInput label="Full name" value={fullName} onChangeText={(value) => { setFullName(value); clearError('fullName'); }} placeholder="Enter Name" error={errors.fullName} leftIcon="person-outline" />
        <FormInput label="Email" value={email} onChangeText={(value) => { setEmail(value); clearError('email'); }} placeholder="Enter email address" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" error={errors.email} leftIcon="mail-outline" />
        <FormInput label="Phone" value={phone} onChangeText={(value) => { setPhone(value); clearError('phone'); }} placeholder="Enter Phone Number" keyboardType="phone-pad" error={errors.phone} leftIcon="call-outline" />
        <FormInput
          label="Password"
          value={password}
          onChangeText={(value) => { setPassword(value); clearError('password'); }}
          placeholder="Enter Password"
          secureTextEntry={!showPassword}
          error={errors.password}
          helper="Use 8+ characters with at least one uppercase letter and one number."
          leftIcon="lock-closed-outline"
          rightElement={
            <Pressable onPress={() => setShowPassword((current) => !current)} accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color={theme.colors.textMuted} />
            </Pressable>
          }
        />
        <PrimaryButton title="Create account" onPress={handleSignup} loading={isSubmitting} />

        <Pressable onPress={() => navigation.goBack()} style={{ marginTop: theme.spacing.xl }} accessibilityRole="button">
          <Text style={{ color: theme.colors.textMuted, textAlign: 'center', fontWeight: '700' }}>
            Already have an account? <Text style={{ color: theme.colors.primary, fontWeight: '900' }}>Log in</Text>
          </Text>
        </Pressable>
      </Card>
    </ScreenWrapper>
  );
}

import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Shadows, Colors } from '@/constants/theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  variant?: 'default' | 'card';
};

export function ThemedView({ style, lightColor, darkColor, variant = 'default', ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, variant === 'card' ? 'card' : 'background');
  const theme = useColorScheme() ?? 'light';

  let cardStyle = {};
  if (variant === 'card') {
    cardStyle = {
      borderRadius: 16,
      ...(Shadows[theme]),
      borderWidth: 1,
      borderColor: Colors[theme].border,
      padding: 16,
      marginVertical: 8,
    };
  }

  return <View style={[{ backgroundColor }, cardStyle, style]} {...otherProps} />;
}

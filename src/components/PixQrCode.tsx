import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { toQR } from 'toqr';

type PixQrCodeProps = {
  payload: string;
};

const QUIET_ZONE = 4;

export function PixQrCode({ payload }: PixQrCodeProps) {
  const modules = useMemo(() => toQR(payload), [payload]);
  const size = Math.sqrt(modules.length);
  const fullSize = size + QUIET_ZONE * 2;

  return (
    <View
      style={styles.frame}
      accessible
      accessibilityRole="image"
      accessibilityLabel="QR Code Pix com o valor deste pedido"
    >
      <View style={styles.matrix}>
        {Array.from({ length: fullSize }, (_, row) => (
          <View key={`row-${row}`} style={styles.row}>
            {Array.from({ length: fullSize }, (_, column) => {
              const moduleRow = row - QUIET_ZONE;
              const moduleColumn = column - QUIET_ZONE;
              const isDark =
                moduleRow >= 0 &&
                moduleRow < size &&
                moduleColumn >= 0 &&
                moduleColumn < size &&
                modules[moduleRow * size + moduleColumn] === 1;

              return <View key={`module-${column}`} style={[styles.module, isDark && styles.darkModule]} />;
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    padding: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EADBD6',
  },
  matrix: {
    width: 120,
    height: 120,
    backgroundColor: '#FFFFFF',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  module: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  darkModule: {
    backgroundColor: '#351A31',
  },
});

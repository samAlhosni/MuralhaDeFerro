import type { CapacitorConfig } from '@capacitor/cli';

// ATENÇÃO: o appId (nome do pacote) é PERMANENTE depois de publicado na Play Store.
const config: CapacitorConfig = {
  appId: 'com.muralhadeferro.game',
  appName: 'Muralha de Ferro',
  webDir: 'dist',
  android: {
    backgroundColor: '#0e1620',
  },
};

export default config;

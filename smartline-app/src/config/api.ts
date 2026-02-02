import Constants from 'expo-constants';

const debuggerHost = Constants.expoConfig?.hostUri;
const localhost = debuggerHost?.split(':')[0];

export const API_URL = localhost
    ? `http://${localhost}:3000/api`
    : 'http://10.0.2.2:3000/api';


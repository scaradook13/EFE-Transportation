import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';

const rpName = 'EFE Taxi Dispatch';
const rpID = process.env.NODE_ENV === 'development' ? 'localhost' : (process.env.VITE_APP_DOMAIN || 'localhost');
const origin = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : `https://${process.env.VITE_APP_DOMAIN || 'localhost'}`;

export const getWebAuthnConfig = () => ({ rpName, rpID, origin });
export const getChallengeStorage = () => useStorage('memory:webauthn');
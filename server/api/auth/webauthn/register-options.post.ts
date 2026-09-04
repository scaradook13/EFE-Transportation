import { generateRegistrationOptions } from '@simplewebauthn/server';
import { getWebAuthnConfig, getChallengeStorage } from '~/server/utils/webauthn';
import { v4 as uuidv4 } from 'uuid';

export default defineEventHandler(async (event) => {
  requireAuth(event);
  const body = await readBody(event);
  const username = body.username || 'driver';

  const { rpName, rpID } = getWebAuthnConfig();
  const storage = getChallengeStorage();
  
  const userId = uuidv4();

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new Uint8Array(Buffer.from(userId)),
    userName: username,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'discouraged',
      userVerification: 'preferred',
    },
  });

  await storage.setItem(`reg-${userId}`, options.challenge);

  return { options, userId };
});
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { getWebAuthnConfig, getChallengeStorage } from '~~/server/utils/webauthn';

export default defineEventHandler(async (event) => {
  requireAuth(event);
  const body = await readBody(event);
  
  const storage = getChallengeStorage();
  const expectedChallenge = await storage.getItem(`reg-${body.userId}`) as string;
  if (!expectedChallenge) throw createError({ statusCode: 400, message: 'Registration challenge expired or missing' });

  const { rpID, origin } = getWebAuthnConfig();

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch (error: any) {
    throw createError({ statusCode: 400, message: error.message });
  }

  const { verified, registrationInfo } = verification;
  if (!verified || !registrationInfo) {
    throw createError({ statusCode: 400, message: 'Registration verification failed' });
  }

  const { credential } = registrationInfo;
  const { id: credentialID, publicKey: credentialPublicKey, counter } = credential;

  await storage.removeItem(`reg-${body.userId}`);

  return {
    success: true,
    credential: {
      credentialID,
      credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64url'),
      counter,
    }
  };
});

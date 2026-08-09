const AUDD_API_URL = 'https://api.audd.io/';
const AUDD_TOKEN = process.env.AUDD_API_TOKEN;

export interface AudDResult {
  status: 'success' | 'error';
  result: {
    artist: string;
    title: string;
    album: string;
    release_date: string;
    label: string;
    isrc?: string;
    spotify?: { id: string; name: string };
    apple_music?: { name: string };
    deezer?: { id: string };
  } | null;
  error?: { error_code: number; error_message: string };
}

export interface FingerprintCheckResult {
  isCopyrighted: boolean;
  isDuplicate: boolean;
  matchedTrack: AudDResult['result'] | null;
  canProceed: boolean;
  reason?: string;
}

export async function checkAudioFingerprint(
  audioBuffer: Buffer,
  artistDisplayName: string,
): Promise<FingerprintCheckResult> {
  if (!AUDD_TOKEN) {
    console.warn('[AudD] No API token configured — skipping fingerprint check');
    return { isCopyrighted: false, isDuplicate: false, matchedTrack: null, canProceed: true };
  }

  try {
    const formData = new FormData();
    formData.append('api_token', AUDD_TOKEN);
    formData.append('return', 'spotify,apple_music,deezer');
    formData.append('file', new Blob([new Uint8Array(audioBuffer)], { type: 'audio/mpeg' }), 'track.mp3');

    const response = await fetch(AUDD_API_URL, { method: 'POST', body: formData });
    const data: AudDResult = await response.json();

    if (data.status === 'success' && data.result === null) {
      return {
        isCopyrighted: false,
        isDuplicate: false,
        matchedTrack: null,
        canProceed: true,
      };
    }

    if (data.status === 'success' && data.result !== null) {
      const match = data.result;
      const uploaderName = artistDisplayName.toLowerCase().trim();
      const matchedArtist = match.artist.toLowerCase().trim();
      const isLikelySameArtist =
        uploaderName.includes(matchedArtist) || matchedArtist.includes(uploaderName);

      if (isLikelySameArtist) {
        return {
          isCopyrighted: false,
          isDuplicate: true,
          matchedTrack: match,
          canProceed: true,
          reason: `This track appears to already be distributed as "${match.title}" by ${match.artist}. Proceeding, but please ensure you have rights.`,
        };
      }

      return {
        isCopyrighted: true,
        isDuplicate: false,
        matchedTrack: match,
        canProceed: false,
        reason: `This audio matches "${match.title}" by ${match.artist} (${match.label || 'unknown label'}). Upload rejected to prevent copyright infringement.`,
      };
    }

    console.error('[AudD] API error:', data.error);
    return {
      isCopyrighted: false,
      isDuplicate: false,
      matchedTrack: null,
      canProceed: true,
      reason: 'Fingerprint check failed — proceeding without verification',
    };
  } catch (err) {
    console.error('[AudD] Network error during fingerprint check:', err);
    return {
      isCopyrighted: false,
      isDuplicate: false,
      matchedTrack: null,
      canProceed: true,
      reason: 'Fingerprint check unavailable — proceeding',
    };
  }
}

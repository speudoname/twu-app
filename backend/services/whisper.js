const OpenAI = require('openai');
const db = require('../database/db');
const fs = require('fs');

/**
 * Get OpenAI API key from database settings
 */
function getOpenAIKey() {
  const settings = db.prepare('SELECT openai_api_key FROM email_settings WHERE id = 1').get();

  if (!settings || !settings.openai_api_key) {
    throw new Error('OpenAI API key not configured in admin settings');
  }

  return settings.openai_api_key;
}

/**
 * Transcribe audio file using OpenAI Whisper API
 * @param {string} audioFilePath - Path to the audio file
 * @param {string} language - Optional language code (e.g., 'en', 'ka')
 * @returns {Promise<string>} Transcribed text
 */
async function transcribeAudio(audioFilePath, language = null) {
  try {
    const apiKey = getOpenAIKey();
    const openai = new OpenAI({ apiKey });

    // Rename file to have .webm extension
    const audioFileWithExt = audioFilePath.endsWith('.webm') ? audioFilePath : `${audioFilePath}.webm`;
    if (!audioFilePath.endsWith('.webm')) {
      fs.renameSync(audioFilePath, audioFileWithExt);
    }

    const audioFile = fs.createReadStream(audioFileWithExt);

    // Call Whisper API
    const transcriptionOptions = {
      file: audioFile,
      model: 'whisper-1',
    };

    // Add language if specified
    if (language) {
      transcriptionOptions.language = language;
    }

    const transcription = await openai.audio.transcriptions.create(transcriptionOptions);

    return transcription.text;
  } catch (error) {
    console.error('Whisper transcription error:', error);

    if (error.message.includes('API key')) {
      throw new Error('OpenAI API key is invalid or not configured');
    }

    throw new Error(`Transcription failed: ${error.message}`);
  } finally {
    // Clean up: delete the temporary audio file
    try {
      const audioFileWithExt = audioFilePath.endsWith('.webm') ? audioFilePath : `${audioFilePath}.webm`;
      if (fs.existsSync(audioFileWithExt)) {
        fs.unlinkSync(audioFileWithExt);
      }
      // Also try to delete the original file if it exists
      if (fs.existsSync(audioFilePath)) {
        fs.unlinkSync(audioFilePath);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up audio file:', cleanupError);
    }
  }
}

module.exports = {
  transcribeAudio,
  getOpenAIKey
};

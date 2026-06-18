import type { App } from 'obsidian';

export interface DailyNotesConfig {
  folder?: string;
  format?: string;
}

interface InternalDailyNotesPlugin {
  instance?: {
    options?: {
      folder?: string;
      format?: string;
    };
  };
}

interface AppWithInternalPlugins extends App {
  internalPlugins?: {
    plugins?: {
      'daily-notes'?: InternalDailyNotesPlugin;
    };
  };
}

export function getDailyNotesConfig(app: App): DailyNotesConfig | undefined {
  const dailyNotes = (app as AppWithInternalPlugins).internalPlugins?.plugins?.['daily-notes'];
  const options = dailyNotes?.instance?.options;
  if (!options) return undefined;
  return {
    folder: options.folder,
    format: options.format,
  };
}

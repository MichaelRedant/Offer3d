import React, { createContext, useCallback, useEffect, useState } from 'react';

export const SettingsContext = createContext();

const ENDPOINT = `${import.meta.env.BASE_URL}api/update-settings.php`;
const FETCH_ENDPOINT = `${import.meta.env.BASE_URL}api/get-settings.php`;

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(FETCH_ENDPOINT, { cache: 'no-store' });
      if (!res.ok) throw new Error('Fout bij laden instellingen');
      const data = await res.json();
      setSettings(data);
    } catch (error) {
      console.error('Fout bij ophalen instellingen:', error);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = useCallback(
    async (updatedSettings) => {
      const payload = { ...updatedSettings };

      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || 'Fout bij opslaan instellingen');
        }

        setSettings((prev) => ({ ...(prev || {}), ...payload }));
        return await res.json();
      } catch (error) {
        console.error('Fout bij opslaan instellingen:', error);
        throw error;
      }
    },
    []
  );

  return (
    <SettingsContext.Provider value={{ settings, setSettings, saveSettings, loading, reload: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

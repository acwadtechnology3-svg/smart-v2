import React, { useEffect, useState } from 'react';
import { Image, ImageProps, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

interface CachedImageProps extends ImageProps {
    source: { uri: string };
}

export const CachedImage = (props: CachedImageProps) => {
    const { source, style, ...rest } = props;
    const { uri } = source;
    const [imgUri, setImgUri] = useState<string | null>(null);

    useEffect(() => {
        if (!uri) return;

        const init = async () => {
            try {
                // Sanitize URI to create a valid filename
                // Remove protocol and special chars
                const name = uri.replace(/[^a-zA-Z0-9]/g, '_');
                const path = `${FileSystem.cacheDirectory}${name}.jpg`; // Assume jpg or irrelevant

                // 1. Check if cached file exists
                const fileInfo = await FileSystem.getInfoAsync(path);

                if (fileInfo.exists) {
                    setImgUri(path);

                    // Optional: Background update
                    // We can attempt to download and see if it's different?
                    // For now, we always download to ensure freshness for next launch
                    // If you want immediate update, we'd need to force refresh
                    downloadImage(uri, path);
                } else {
                    // No cache, show remote immediately and cache it
                    setImgUri(uri);
                    downloadImage(uri, path);
                }
            } catch (err) {
                console.log('[CachedImage] Error:', err);
                setImgUri(uri);
            }
        };

        init();
    }, [uri]);

    const downloadImage = async (remoteUri: string, localPath: string) => {
        try {
            // Download to temp file
            const tempPath = localPath + '_temp';
            const { uri: dlUri } = await FileSystem.downloadAsync(remoteUri, tempPath);

            // Move/Overwrite to real path
            await FileSystem.moveAsync({
                from: dlUri,
                to: localPath
            });

            // If we were showing remote, switch to local now
            // Or if we need to refresh UI (this might cause blink, optional)
            // setImgUri(localPath + '?t=' + Date.now()); 
        } catch (e) {
            console.log('[CachedImage] Download failed:', e);
        }
    };

    if (!imgUri) {
        // Placeholder or nothing
        return <Image source={source} style={style} {...rest} />;
    }

    return <Image source={{ uri: imgUri }} style={style} {...rest} />;
};

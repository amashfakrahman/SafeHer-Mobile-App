import { useEffect, useRef, useState } from 'react';
import { Accelerometer } from 'expo-sensors';

function now() {
  return Date.now();
}

export function useShakeSos({ enabled = true, onShake, minimumShakes = 4, windowMs = 2200, cooldownMs = 12000 } = {}) {
  const shakeTimesRef = useRef([]);
  const lastSpikeAtRef = useRef(0);
  const lastTriggerAtRef = useRef(0);
  const onShakeRef = useRef(onShake);
  const [isAvailable, setIsAvailable] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);

  useEffect(() => {
    onShakeRef.current = onShake;
  }, [onShake]);

  useEffect(() => {
    let subscription;
    let mounted = true;

    async function start() {
      try {
        const available = await Accelerometer.isAvailableAsync();
        if (!mounted) return;
        setIsAvailable(Boolean(available));
        if (!available || !enabled) return;

        Accelerometer.setUpdateInterval(120);
        subscription = Accelerometer.addListener(({ x, y, z }) => {
          const timestamp = now();
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          const isSpike = magnitude > 2.55;
          const enoughGap = timestamp - lastSpikeAtRef.current > 260;

          if (!isSpike || !enoughGap) return;

          lastSpikeAtRef.current = timestamp;
          const recent = [...shakeTimesRef.current.filter((item) => timestamp - item < windowMs), timestamp];
          shakeTimesRef.current = recent;
          setShakeCount(Math.min(recent.length, minimumShakes));

          if (recent.length >= minimumShakes && timestamp - lastTriggerAtRef.current > cooldownMs) {
            lastTriggerAtRef.current = timestamp;
            shakeTimesRef.current = [];
            setShakeCount(0);
            onShakeRef.current?.();
          }
        });
      } catch (_error) {
        if (mounted) setIsAvailable(false);
      }
    }

    start();

    return () => {
      mounted = false;
      if (subscription) subscription.remove();
    };
  }, [cooldownMs, enabled, minimumShakes, windowMs]);

  return { isAvailable, shakeCount };
}

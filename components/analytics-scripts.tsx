'use client';

import { useEffect } from 'react';

export function AnalyticsScripts() {
  useEffect(() => {
    let cancelled = false;
    fetch('/api/integrations/public').then(r => r.json()).then((d) => {
      if (cancelled) return;
      const ga = d?.googleAnalyticsId;
      const px = d?.facebookPixelId;

      if (ga && !document.getElementById('ga-src')) {
        const s = document.createElement('script');
        s.id = 'ga-src';
        s.async = true;
        s.src = `https://www.googletagmanager.com/gtag/js?id=${ga}`;
        document.head.appendChild(s);
        const s2 = document.createElement('script');
        s2.id = 'ga-init';
        s2.innerHTML = `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${ga}');`;
        document.head.appendChild(s2);
      }

      if (px && !document.getElementById('fb-pixel')) {
        const s = document.createElement('script');
        s.id = 'fb-pixel';
        s.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init', '${px}');fbq('track', 'PageView');`;
        document.head.appendChild(s);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return null;
}

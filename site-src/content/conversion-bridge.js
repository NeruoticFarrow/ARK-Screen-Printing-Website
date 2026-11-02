(function setupQuoteFormConversionBridge() {
    const QUOTE_FORM_ORIGIN = 'https://quotes.arkscreenprinting.com';
    const PARTIAL_LEAD_SAVED_EVENT = 'ark-quote-form:partial-lead-saved';
    const CONVERSION_DESTINATION = 'AW-11274669650/hhhlCObY9sMcENKcl4Aq';
    let conversionReported = false;

    if (typeof window.gtag === 'function') {
        window.gtag('config', 'AW-11274669650');
    }

    window.addEventListener('message', function(event) {
        if (event.origin !== QUOTE_FORM_ORIGIN) return;
        if (!event.data || event.data.type !== PARTIAL_LEAD_SAVED_EVENT) return;
        if (conversionReported || typeof window.gtag !== 'function') return;

        window.gtag('event', 'conversion', {
            'send_to': CONVERSION_DESTINATION
        });
        conversionReported = true;

        // Use the same successful save and duplicate guard as Google Ads.
        // Route only to GA4; never send the customer's contact information.
        window.gtag('event', 'generate_lead', {
            'send_to': 'G-3HRP9PCVCH'
        });
    });
})();

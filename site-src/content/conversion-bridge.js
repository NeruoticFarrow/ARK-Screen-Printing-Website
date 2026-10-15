(function setupQuoteFormConversionBridge() {
    const QUOTE_FORM_ORIGIN = 'https://ark-quote-form-production.up.railway.app';
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
    });
})();

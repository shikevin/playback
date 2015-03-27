if (window.site_data.settings.SENTRY_JS_PROJECT_URL) {
    Raven.config(window.site_data.settings.SENTRY_JS_PROJECT_URL, {
        whitelistUrls: [/[\w-]+\.tophat\.com/, /\w+\.cloudfront.net/],
        logger: 'javascript'
    }).install();

    if (window.user_data.id) {
        Raven.setUserContext({
            id: window.user_data.id,
            email: window.user_data.email
        });
    }
}

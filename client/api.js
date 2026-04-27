// Resolve API URLs when frontend is opened outside Flask.
(function() {
    function isFlaskOrigin() {
        return window.location.origin === "http://127.0.0.1:5000" || window.location.origin === "http://localhost:5000";
    }

    function shouldUseLocalApiHost() {
        var isLocalHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        return window.location.protocol === "file:" || (isLocalHost && !isFlaskOrigin());
    }

    window.apiUrl = function(path) {
        if (!path) return path;
        if (/^https?:\/\//i.test(path)) return path;
        if (shouldUseLocalApiHost()) return "http://127.0.0.1:5000" + path;
        return path;
    };
})();

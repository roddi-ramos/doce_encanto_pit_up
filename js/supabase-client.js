(() => {
  const cfg = window.APP_CONFIG || {};
  const valid = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.includes("COLE_AQUI") && !cfg.SUPABASE_ANON_KEY.includes("COLE_AQUI");
  window.db = valid && window.supabase
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;
  window.requireDb = () => {
    if (!window.db) throw new Error("Chave do Banco de Dados não configurada.");
    return window.db;
  };
})();

CREATE OR REPLACE FUNCTION public.cofre_encrypt_internal(
  p_plaintext text,
  p_key       text
)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pgp_sym_encrypt(p_plaintext, p_key);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Falha ao criptografar senha do cofre.';
END;
$$;

REVOKE ALL ON FUNCTION public.cofre_encrypt_internal(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cofre_encrypt_internal(text, text) TO service_role;
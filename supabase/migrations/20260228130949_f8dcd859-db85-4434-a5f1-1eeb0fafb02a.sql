
CREATE OR REPLACE FUNCTION public.get_referral_leaderboard(result_limit integer DEFAULT 25)
RETURNS TABLE(
  rank bigint,
  display_name_masked text,
  signup_count integer,
  click_count integer,
  conversion_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY il.signup_count DESC, il.click_count DESC) AS rank,
    CASE
      WHEN p.display_name IS NOT NULL AND length(p.display_name) > 2
        THEN left(p.display_name, 1) || repeat('•', greatest(length(p.display_name) - 2, 1)) || right(p.display_name, 1)
      ELSE 'Anonymous'
    END AS display_name_masked,
    il.signup_count,
    il.click_count,
    CASE WHEN il.click_count > 0
      THEN round((il.signup_count::numeric / il.click_count::numeric) * 100, 1)
      ELSE 0
    END AS conversion_rate
  FROM invite_links il
  LEFT JOIN profiles p ON p.user_id = il.user_id
  WHERE il.signup_count > 0
  ORDER BY il.signup_count DESC, il.click_count DESC
  LIMIT result_limit;
END;
$$;

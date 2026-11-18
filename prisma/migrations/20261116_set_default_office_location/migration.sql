ALTER TABLE public.offices
  ADD COLUMN IF NOT EXISTS address text;

UPDATE public.offices
SET is_active = false
WHERE is_active = true;

INSERT INTO public.offices (id, name, address, latitude, longitude, radius_m, is_active)
VALUES (
  '8d340ded-05ce-4be5-8529-f2c028147501',
  'Kolam Renang Tirta Mulya',
  'Jl. Somawinata No.88, Tanimulya, Ngamprah, Kabupaten Bandung Barat, Jawa Barat 40552.',
  -6.8603952,
  107.525447,
  100,
  true
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    address = EXCLUDED.address,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    radius_m = EXCLUDED.radius_m,
    is_active = EXCLUDED.is_active;

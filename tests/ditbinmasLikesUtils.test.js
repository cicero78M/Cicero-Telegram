import { computeDitbinmasLikesStats } from '../src/handler/fetchabsensi/insta/ditbinmasLikesUtils.js';

test('matches active Instagram username while retaining legacy fallback', () => {
  const { userStats, summary } = computeDitbinmasLikesStats(
    [{ user_id: 'u1', nama: 'Handayani', insta: 'handayani15914', effective_insta: 'hhandayani_15' }],
    [new Set(['hhandayani_15'])],
    1,
  );

  expect(userStats[0]).toMatchObject({ count: 1, status: 'lengkap' });
  expect(summary).toMatchObject({ total: 1, lengkap: 1, kurang: 0, belum: 0, noUsername: 0 });
});

test('does not change behavior for legacy-only and empty usernames', () => {
  const { userStats, summary } = computeDitbinmasLikesStats(
    [
      { user_id: 'u1', insta: 'legacy_user' },
      { user_id: 'u2', insta: '' },
    ],
    [new Set(['legacy_user'])],
    1,
  );

  expect(userStats.map(({ count, status }) => ({ count, status }))).toEqual([
    { count: 1, status: 'lengkap' },
    { count: 0, status: 'noUsername' },
  ]);
  expect(summary).toMatchObject({ total: 2, lengkap: 1, belum: 0, noUsername: 1 });
});

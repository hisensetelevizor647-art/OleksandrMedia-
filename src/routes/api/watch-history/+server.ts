import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { getUserFromRequest } from '$lib/auth';

export const POST: RequestHandler = async (event) => {
	const user = getUserFromRequest(event);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const { videoId } = await event.request.json();
		await db.query(
			'INSERT INTO watch_history (user_id, video_id) VALUES ($1, $2)',
			[user.id, videoId]
		);
		return json({ success: true });
	} catch (error) {
		// Ignore duplicate key errors or other non-critical issues
		return json({ success: false });
	}
};

export const GET: RequestHandler = async (event) => {
	const user = getUserFromRequest(event);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		// Use DISTINCT ON to get unique videos, ordered by most recently watched
		const result = await db.query(
			`SELECT DISTINCT ON (v.id) 
				v.*, 
				u.username, 
				u.avatar as user_avatar,
				wh.watched_at
			 FROM watch_history wh
			 JOIN videos v ON wh.video_id = v.id
			 JOIN users u ON v.user_id = u.id
			 WHERE wh.user_id = $1
			 ORDER BY v.id, wh.watched_at DESC
			 LIMIT 50`,
			[user.id]
		);

		// Re-sort by watched_at because DISTINCT ON requires the first ORDER BY column to match
		const videos = result.rows
			.sort((a, b) => new Date(b.watched_at).getTime() - new Date(a.watched_at).getTime())
			.map(v => ({
				...v,
				likes: 0, // TODO
				dislikes: 0
			}));

		return json({ videos });
	} catch (error) {
		console.error('History error:', error);
		return json({ error: 'Failed to load history' }, { status: 500 });
	}
};

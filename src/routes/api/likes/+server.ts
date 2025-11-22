import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { getUserFromRequest } from '$lib/auth';

export const POST: RequestHandler = async (event) => {
	const user = getUserFromRequest(event);

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { videoId, type } = await event.request.json();

		if (!videoId || !type || !['like', 'dislike'].includes(type)) {
			return json({ error: 'Invalid request' }, { status: 400 });
		}

		const result = await db.query(
			'SELECT * FROM likes WHERE video_id = $1 AND user_id = $2',
			[videoId, user.id]
		);
		const existing = result.rows[0];

		if (existing) {
			if (existing.type === type) {
				// Remove like
				await db.query(
					'DELETE FROM likes WHERE video_id = $1 AND user_id = $2',
					[videoId, user.id]
				);
				return json({ action: 'removed', type });
			} else {
				// Update like
				await db.query(
					'UPDATE likes SET type = $1 WHERE video_id = $2 AND user_id = $3',
					[type, videoId, user.id]
				);
				return json({ action: 'updated', type });
			}
		} else {
			// Add like
			await db.query(
				'INSERT INTO likes (video_id, user_id, type) VALUES ($1, $2, $3)',
				[videoId, user.id, type]
			);
			return json({ action: 'added', type });
		}
	} catch (error) {
		console.error('Like error:', error);
		return json({ error: 'Failed to process like' }, { status: 500 });
	}
};

export const GET: RequestHandler = async (event) => {
	const user = getUserFromRequest(event);
	const videoId = event.url.searchParams.get('videoId');

	if (!user || !videoId) {
		return json({ like: null });
	}

	const result = await db.query(
		'SELECT type FROM likes WHERE video_id = $1 AND user_id = $2',
		[videoId, user.id]
	);
	const like = result.rows[0];

	return json({ like: like?.type || null });
};

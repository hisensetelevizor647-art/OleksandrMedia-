import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { getUserFromRequest } from '$lib/auth';

export const GET: RequestHandler = async ({ params }) => {
	const result = await db.query(
		`SELECT v.*, u.username, u.avatar as user_avatar, u.description as user_description
		 FROM videos v
		 JOIN users u ON v.user_id = u.id
		 WHERE v.id = $1`,
		[params.id]
	);

	const video = result.rows[0];

	if (!video) {
		return json({ error: 'Video not found' }, { status: 404 });
	}

	// Increment views (fire and forget)
	db.query('UPDATE videos SET views = COALESCE(views, 0) + 1 WHERE id = $1', [params.id])
		.catch(err => console.error('Failed to increment views:', err));

	const formattedVideo = {
		...video,
		likes: 0, // TODO: Implement
		dislikes: 0,
		subscribers: 0
	};

	return json({ video: formattedVideo });
};

export const DELETE: RequestHandler = async (event) => {
	const user = getUserFromRequest(event);

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const result = await db.query('SELECT user_id FROM videos WHERE id = $1', [event.params.id]);
	const video = result.rows[0];

	if (!video) {
		return json({ error: 'Video not found' }, { status: 404 });
	}

	if (video.user_id !== user.id) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	await db.query('DELETE FROM videos WHERE id = $1', [event.params.id]);

	return json({ success: true });
};

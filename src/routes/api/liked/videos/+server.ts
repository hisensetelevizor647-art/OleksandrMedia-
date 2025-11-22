import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { getUserFromRequest } from '$lib/auth';

export const GET: RequestHandler = async (event) => {
	const user = getUserFromRequest(event);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const result = await db.query(
			`SELECT l.created_at, v.*, u.username, u.avatar as user_avatar
			 FROM likes l
			 JOIN videos v ON l.video_id = v.id
			 JOIN users u ON v.user_id = u.id
			 WHERE l.user_id = $1 AND l.type = 'like'
			 ORDER BY l.created_at DESC`,
			[user.id]
		);

		const videos = result.rows.map(v => ({
			...v,
			likes: 0, // TODO
			dislikes: 0
		}));

		return json({ videos });
	} catch (error) {
		return json({ error: 'Failed to load liked videos' }, { status: 500 });
	}
};

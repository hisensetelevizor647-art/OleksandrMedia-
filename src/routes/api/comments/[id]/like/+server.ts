import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { getUserFromRequest } from '$lib/auth';

export const POST: RequestHandler = async (event) => {
	const user = getUserFromRequest(event);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const commentId = event.params.id;
		const { type } = await event.request.json();

		if (!['like', 'dislike'].includes(type)) {
			return json({ error: 'Invalid type' }, { status: 400 });
		}

		const result = await db.query(
			'SELECT type FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
			[commentId, user.id]
		);
		const existing = result.rows[0];

		if (existing) {
			if (existing.type === type) {
				await db.query(
					'DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
					[commentId, user.id]
				);
				return json({ action: 'removed' });
			} else {
				await db.query(
					'UPDATE comment_likes SET type = $1 WHERE comment_id = $2 AND user_id = $3',
					[type, commentId, user.id]
				);
				return json({ action: 'updated', type });
			}
		} else {
			await db.query(
				'INSERT INTO comment_likes (comment_id, user_id, type) VALUES ($1, $2, $3)',
				[commentId, user.id, type]
			);
			return json({ action: 'added', type });
		}
	} catch (error) {
		console.error('Comment like error:', error);
		return json({ error: 'Failed to like comment' }, { status: 500 });
	}
};

export const GET: RequestHandler = async (event) => {
	const user = getUserFromRequest(event);
	if (!user) return json({ like: null });

	try {
		const commentId = event.params.id;
		const result = await db.query(
			'SELECT type FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
			[commentId, user.id]
		);
		const like = result.rows[0];

		return json({ like: like?.type || null });
	} catch (error) {
		return json({ like: null });
	}
};

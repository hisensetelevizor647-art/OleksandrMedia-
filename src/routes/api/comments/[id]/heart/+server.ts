import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { getUserFromRequest } from '$lib/auth';

export const POST: RequestHandler = async (event) => {
	const user = getUserFromRequest(event);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const commentId = event.params.id;

		// Verify user is video author
		const result = await db.query(
			`SELECT c.*, v.user_id as video_owner_id 
			 FROM comments c 
			 JOIN videos v ON c.video_id = v.id 
			 WHERE c.id = $1`,
			[commentId]
		);
		const comment = result.rows[0];

		if (!comment) {
			return json({ error: 'Comment not found' }, { status: 404 });
		}

		if (comment.video_owner_id !== user.id) {
			return json({ error: 'Only video author can heart comments' }, { status: 403 });
		}

		const newHearted = !comment.is_hearted;
		await db.query('UPDATE comments SET is_hearted = $1 WHERE id = $2', [newHearted, commentId]);

		return json({ is_hearted: newHearted });
	} catch (error) {
		console.error('Heart error:', error);
		return json({ error: 'Failed to heart comment' }, { status: 500 });
	}
};

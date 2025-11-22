import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { getUserFromRequest } from '$lib/auth';
import { storage } from '$lib/storage';

export const PUT: RequestHandler = async (event) => {
	const user = getUserFromRequest(event);

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const formData = await event.request.formData();
		const title = formData.get('title') as string;
		const description = formData.get('description') as string;
		const thumbnailFile = formData.get('thumbnail') as File | null;
		const videoId = event.params.id;

		if (!title) {
			return json({ error: 'Title is required' }, { status: 400 });
		}

		const result = await db.query('SELECT * FROM videos WHERE id = $1', [videoId]);
		const video = result.rows[0];

		if (!video) {
			return json({ error: 'Video not found' }, { status: 404 });
		}

		if (video.user_id !== user.id) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		let thumbnailUrl = video.thumbnail_url || video.thumbnail;

		if (thumbnailFile && thumbnailFile.size > 0) {
			const thumbKey = storage.generateFileName(user.id, 'thumbnail', thumbnailFile.name);
			const { url } = await storage.upload(thumbnailFile, thumbKey, thumbnailFile.type);
			thumbnailUrl = url;
		}

		const updateResult = await db.query(
			`UPDATE videos 
			 SET title = $1, description = $2, thumbnail_url = $3, thumbnail = $3
			 WHERE id = $4
			 RETURNING *`,
			[title, description || null, thumbnailUrl, videoId]
		);

		const updatedVideo = updateResult.rows[0];

		return json({ video: updatedVideo });
	} catch (error: any) {
		console.error('Update error:', error);
		return json({ error: 'Failed to update video: ' + error.message }, { status: 500 });
	}
};

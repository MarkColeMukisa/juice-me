<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpFoundation\Request as SymfonyRequest;
use Symfony\Component\HttpFoundation\Response;

/**
 * Lets a phone send a picture as a form, the way Grit's Expo app does.
 *
 * Nevela takes an upload as the request's body: the file and nothing else. A browser sends
 * that well. On Android, React Native can't: whatever route the bytes take through
 * JavaScript (a Blob, an ArrayBuffer), what reached Laravel was not the picture, and it was
 * refused as "doesn't contain image data". In a form, a file is named by its address on the
 * phone ({ uri, name, type }) and the phone's own network code reads it from disk, so the
 * bytes never pass through JavaScript.
 *
 * The phone POSTs the form with _method=PUT (PHP only reads forms sent by POST). Here the
 * file in it becomes the request's body, and Nevela checks it, optimises it and stores it
 * exactly as it would a browser's upload.
 */
class UploadsFromForms
{
    public function handle(Request $request, Closure $next): Response
    {
        $upload = $request->isMethod('PUT') && ($request->is('api/auth/avatar') || $request->is('api/_nevela/uploads/*'));
        $file = $upload ? $request->file('file') : null;
        if (! $file instanceof UploadedFile) {
            return $next($request);
        }

        if (! $file->isValid()) {
            $tooBig = in_array($file->getError(), [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true);

            return response()->json(['error' => $tooBig
                ? 'That picture is larger than this server takes (upload_max_filesize is '.ini_get('upload_max_filesize').').'
                : 'The picture didn\'t arrive whole. Try again.'], $tooBig ? 413 : 422);
        }

        $stream = fopen($file->getRealPath(), 'rb');
        // Request's content is protected, and there is no setter for it.
        \Closure::bind(function ($content): void {
            $this->content = $content;
        }, $request, SymfonyRequest::class)($stream);
        $request->headers->set('Content-Type', $file->getClientMimeType());
        $request->headers->set('Content-Length', (string) $file->getSize());

        return $next($request);
    }
}

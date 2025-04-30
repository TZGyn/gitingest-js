CREATE TABLE "git" (
	"provider" varchar(255) NOT NULL,
	"repo" text NOT NULL,
	"branch" text NOT NULL,
	"commit" varchar(255) NOT NULL,
	"files" json NOT NULL
);

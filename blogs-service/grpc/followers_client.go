package grpc

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	pb "blogs-service/proto/followers"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type FollowersClient struct {
	client pb.FollowersServiceClient
	conn   *grpc.ClientConn
}

func NewFollowersClient() (*FollowersClient, error) {
	followersAddr := os.Getenv("FOLLOWERS_SERVICE_GRPC_ADDR")
	if followersAddr == "" {
		followersAddr = "followers-service:50051"
	}

	conn, err := grpc.Dial(followersAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, fmt.Errorf("failed to connect to followers service: %w", err)
	}

	client := pb.NewFollowersServiceClient(conn)

	return &FollowersClient{
		client: client,
		conn:   conn,
	}, nil
}

func (fc *FollowersClient) Close() error {
	return fc.conn.Close()
}

func (fc *FollowersClient) GetAccessibleBlogs(userID int32) ([]int32, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	req := &pb.AccessibleBlogsRequest{
		UserId: userID,
	}

	resp, err := fc.client.GetAccessibleBlogs(ctx, req)
	if err != nil {
		log.Printf("Error calling GetAccessibleBlogs: %v", err)
		return nil, err
	}

	return resp.AccessibleAuthors, nil
}

func (fc *FollowersClient) CanReadBlog(readerID, blogAuthorID int32) (bool, string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	req := &pb.CanReadBlogRequest{
		ReaderId:     readerID,
		BlogAuthorId: blogAuthorID,
	}

	resp, err := fc.client.CanReadBlog(ctx, req)
	if err != nil {
		log.Printf("Error calling CanReadBlog: %v", err)
		return false, "", err
	}

	return resp.CanRead, resp.Reason, nil
}

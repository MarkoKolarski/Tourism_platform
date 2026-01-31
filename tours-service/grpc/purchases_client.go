package grpc

import (
	"context"
	"log"
	"time"

	pb "tours-service/proto/purchases"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type PurchasesGRPCClient struct {
	conn   *grpc.ClientConn
	client pb.PurchasesServiceClient
	addr   string
}

func NewPurchasesGRPCClient(addr string) *PurchasesGRPCClient {
	return &PurchasesGRPCClient{
		addr: addr,
	}
}

func (c *PurchasesGRPCClient) Connect() error {
	conn, err := grpc.Dial(c.addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return err
	}

	c.conn = conn
	c.client = pb.NewPurchasesServiceClient(conn)
	log.Printf("[gRPC] Connected to Purchases service at %s", c.addr)
	return nil
}

func (c *PurchasesGRPCClient) VerifyPurchase(userID, tourID int) (bool, string, error) {
	if c.client == nil {
		if err := c.Connect(); err != nil {
			return false, "", err
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	req := &pb.VerifyPurchaseRequest{
		UserId: int32(userID),
		TourId: int32(tourID),
	}

	resp, err := c.client.VerifyPurchase(ctx, req)
	if err != nil {
		log.Printf("[gRPC] Error verifying purchase: %v", err)
		return false, "", err
	}

	if resp.Error != "" {
		log.Printf("[gRPC] Purchase verification error: %s", resp.Error)
		return false, "", nil
	}

	log.Printf("[gRPC] Purchase verification result: user_id=%d, tour_id=%d, has_purchased=%v",
		userID, tourID, resp.HasPurchased)

	return resp.HasPurchased, resp.TokenId, nil
}

func (c *PurchasesGRPCClient) Close() {
	if c.conn != nil {
		c.conn.Close()
		log.Println("[gRPC] Purchases service connection closed")
	}
}
